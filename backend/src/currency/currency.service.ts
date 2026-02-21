import { Injectable, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { Decimal } from '@prisma/client/runtime/library';

const BCT_URL = 'https://www.bct.gov.tn/bct/siteprod/cours.jsp';

/** Taux de change: 1 unité de devise = rateToTND TND (base TND) */
@Injectable()
export class CurrencyService {
  constructor(private prisma: PrismaService) {}

  async getDefaultCurrencyCode(): Promise<string> {
    const company = await this.prisma.company.findFirst();
    const code = company?.defaultCurrencyCode ?? 'TND';
    return code;
  }

  async setDefaultCurrency(code: string): Promise<void> {
    const currency = await this.prisma.currency.findUnique({ where: { code, isActive: true } });
    if (!currency) throw new BadRequestException(`Devise ${code} introuvable ou inactive`);
    let company = await this.prisma.company.findFirst();
    if (!company) {
      company = await this.prisma.company.create({ data: {} });
    }
    await this.prisma.company.update({
      where: { id: company.id },
      data: { defaultCurrencyCode: code },
    });
  }

  async findAll() {
    return this.prisma.currency.findMany({
      where: { isActive: true },
      orderBy: { code: 'asc' },
    });
  }

  async getLatestRates(): Promise<Record<string, number>> {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const rates = await this.prisma.exchangeRate.findMany({
      where: { rateDate: { lte: today } },
      orderBy: { rateDate: 'desc' },
      distinct: ['currencyCode'],
    });
    const map: Record<string, number> = { TND: 1 };
    for (const r of rates) {
      map[r.currencyCode] = Number(r.rateToTND);
    }
    return map;
  }

  /** Convertit un montant d'une devise vers la devise cible (via TND). */
  convert(
    amount: number,
    fromCode: string,
    toCode: string,
    rates: Record<string, number>,
  ): number {
    const from = (fromCode || 'TND').toUpperCase();
    const to = (toCode || 'TND').toUpperCase();
    if (from === to) return amount;
    const rateFrom = rates[from] ?? 1; // TND = 1
    const rateTo = rates[to] ?? 1;
    const amountTND = amount * rateFrom;
    return amountTND / rateTo;
  }

  /** Récupère le taux vers TND pour une devise (1 unit = X TND). */
  getRateToTND(currencyCode: string, rates: Record<string, number>): number {
    const code = (currencyCode || 'TND').toUpperCase();
    return rates[code] ?? 1;
  }

  async importFromBCT(): Promise<{ imported: number; currencies: string[]; error?: string }> {
    let html: string;
    try {
      const res = await fetch(BCT_URL, {
        headers: { 'User-Agent': 'ManagePME/1.0 (Currency sync)' },
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      html = await res.text();
    } catch (e: any) {
      return {
        imported: 0,
        currencies: [],
        error: `Impossible de récupérer la page BCT: ${e?.message || 'réseau'}. Vérifiez l'URL et la connexion.`,
      };
    }

    const rows = this.parseBCTTable(html);
    if (rows.length === 0) {
      return {
        imported: 0,
        currencies: [],
        error: 'Scraping impossible: tableau des cours introuvable ou format de page BCT modifié.',
      };
    }

    const rateDate = new Date();
    rateDate.setHours(0, 0, 0, 0);

    await this.prisma.currency.upsert({
      where: { code: 'TND' },
      create: {
        code: 'TND',
        name: 'Dinar tunisien',
        symbol: 'DT',
        unit: 1,
        isActive: true,
      },
      update: {},
    });
    await this.prisma.exchangeRate.upsert({
      where: {
        currencyCode_rateDate: { currencyCode: 'TND', rateDate },
      },
      create: {
        currencyCode: 'TND',
        rateToTND: new Decimal(1),
        rateDate,
        source: 'BCT',
      },
      update: { rateToTND: new Decimal(1), source: 'BCT' },
    });

    const names: Record<string, string> = {
      DZD: 'Dinar algérien',
      SAR: 'Riyal saoudien',
      CAD: 'Dollar canadien',
      DKK: 'Couronne danoise',
      USD: 'Dollar des USA',
      GBP: 'Livre sterling',
      JPY: 'Yen japonais',
      MAD: 'Dirham marocain',
      NOK: 'Couronne norvégienne',
      SEK: 'Couronne suédoise',
      CHF: 'Franc suisse',
      KWD: 'Dinar koweïtien',
      AED: 'Dirham des EAU',
      EUR: 'Euro',
      LYD: 'Dinar libyen',
      MRU: 'Ouguiya mauritanien',
      BHD: 'Dinar de Bahreïn',
      QAR: 'Rial qatari',
      CNY: 'Yuan chinois',
      OMR: 'Rial omanais',
    };

    let imported = 0;
    const currencies: string[] = [];

    for (const row of rows) {
      const { sigle, unit, valeur } = row;
      if (!sigle || valeur == null) continue;
      const code = sigle.trim().toUpperCase();
      if (code === 'TND') continue;
      const unitNum = unit || 1;
      const rateToTND = valeur / unitNum;

      await this.prisma.currency.upsert({
        where: { code },
        create: {
          code,
          name: names[code] || code,
          symbol: code === 'EUR' ? '€' : code === 'USD' ? '$' : undefined,
          unit: unitNum,
          isActive: true,
        },
        update: { name: names[code] || undefined, unit: unitNum, isActive: true },
      });

      await this.prisma.exchangeRate.upsert({
        where: {
          currencyCode_rateDate: { currencyCode: code, rateDate },
        },
        create: {
          currencyCode: code,
          rateToTND: new Decimal(rateToTND),
          rateDate,
          source: 'BCT',
        },
        update: { rateToTND: new Decimal(rateToTND), source: 'BCT' },
      });
      imported++;
      if (!currencies.includes(code)) currencies.push(code);
    }

    return { imported, currencies };
  }

  /**
   * Parse le tableau "Cours Moyens des Devises Cotées en dinar tunisien" sur la page BCT.
   * Format attendu: lignes <tr> avec cellules contenant Sigle, Unité, Valeur (nombre avec virgule).
   */
  private parseBCTTable(html: string): Array<{ sigle: string; unit: number; valeur: number }> {
    const rows: Array<{ sigle: string; unit: number; valeur: number }> = [];
    const tableMatch = html.match(/<table[^>]*>[\s\S]*?Cours Moyens[\s\S]*?<\/table>/i)
      || html.match(/<table[^>]*class="[^"]*"[^>]*>[\s\S]*?<\/table>/i);
    if (!tableMatch) return rows;

    const table = tableMatch[0];
    const trRegex = /<tr[^>]*>([\s\S]*?)<\/tr>/gi;
    let trMatch;
    while ((trMatch = trRegex.exec(table)) !== null) {
      const cells: string[] = [];
      const tdRegex = /<t[dh][^>]*>([\s\S]*?)<\/t[dh]>/gi;
      let tdMatch;
      while ((tdMatch = tdRegex.exec(trMatch[1])) !== null) {
        cells.push(tdMatch[1].replace(/<[^>]+>/g, '').trim());
      }
      if (cells.length < 4) continue;
      const sigle = cells[1];
      const unitStr = cells[2].replace(/\s/g, '').replace(',', '.');
      const valeurStr = cells[3].replace(/\s/g, '').replace(',', '.');
      const unit = parseInt(unitStr, 10) || 1;
      const valeur = parseFloat(valeurStr);
      if (sigle && !Number.isNaN(valeur)) {
        rows.push({ sigle, unit, valeur });
      }
    }
    return rows;
  }
}
