import jsPDF from 'jspdf';
import { Sale, SaleType, PaymentMethod, SaleRefund, RefundItemLine } from '@/types/sale';
import { ClientType } from '@/types/client';
import type { Quote } from '@/types/quote';

export interface CompanyInfo {
  name?: string | null;
  address?: string | null;
  city?: string | null;
  postalCode?: string | null;
  country?: string | null;
  phone?: string | null;
  email?: string | null;
  siret?: string | null;
  vatNumber?: string | null;
  logo?: string | null;
}

const DEFAULT_COMPANY: CompanyInfo = {
  name: 'Manage PME',
  address: '123 Rue de la Commerce',
  city: '75000 Paris',
  phone: '+33 1 23 45 67 89',
  email: 'contact@managepme.fr',
  siret: '123 456 789 00012',
  vatNumber: 'FR12 345678901',
};

/** Récupère les dimensions naturelles de l'image (aspect ratio) */
function getImageDimensions(dataUrl: string): Promise<{ width: number; height: number }> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve({ width: img.naturalWidth, height: img.naturalHeight });
    img.onerror = () => reject(new Error('Invalid image'));
    img.src = dataUrl;
  });
}

/** Calcule les dimensions pour contenir l'image dans une boîte max (proportions préservées, règle "contain") */
function fitInBox(
  natW: number,
  natH: number,
  maxW: number,
  maxH: number
): { w: number; h: number } {
  if (natW <= 0 || natH <= 0) return { w: maxW, h: maxH };
  const scale = Math.min(maxW / natW, maxH / natH, 1);
  return { w: natW * scale, h: natH * scale };
}

// Proportions graphiques : zone logo par type de document (en mm)
// Facture A4 : logo ~26% largeur page, hauteur ~8% → lisibilité sans dominer
const INVOICE_LOGO_MAX_W = 58;
const INVOICE_LOGO_MAX_H = 24;
// Ticket 80mm : logo ~70% largeur, hauteur proportionnelle
const TICKET_LOGO_MAX_W = 56;
const TICKET_LOGO_MAX_H = 20;

/** Devise d'origine de la vente : affichage sur facture/ticket sans conversion. */
function getSaleCurrencyLabel(sale: { currencyCode?: string | null }): string {
  const code = (sale.currencyCode || 'TND').toUpperCase();
  const map: Record<string, string> = {
    TND: 'TND', EUR: '€', USD: '$', GBP: '£', CHF: 'CHF', JPY: '¥', CAD: 'CAD',
    MAD: 'MAD', DZD: 'DZD', SAR: 'SAR', AED: 'AED', KWD: 'KWD', CNY: '¥',
    DKK: 'DKK', NOK: 'NOK', SEK: 'SEK', BHD: 'BHD', QAR: 'QAR', OMR: 'OMR',
    LYD: 'LYD', MRU: 'MRU',
  };
  return map[code] || code;
}

function getCompanyDisplay(company: CompanyInfo | null | undefined): CompanyInfo {
  if (!company) return DEFAULT_COMPANY;
  return {
    name: company.name || DEFAULT_COMPANY.name,
    address: company.address || DEFAULT_COMPANY.address,
    city: [company.postalCode, company.city].filter(Boolean).join(' ') || DEFAULT_COMPANY.city,
    phone: company.phone || DEFAULT_COMPANY.phone,
    email: company.email || DEFAULT_COMPANY.email,
    siret: company.siret || DEFAULT_COMPANY.siret,
    vatNumber: company.vatNumber || DEFAULT_COMPANY.vatNumber,
    logo: company.logo || undefined,
  };
}

export async function generateInvoice(sale: Sale, company?: CompanyInfo | null) {
  const doc = new jsPDF();
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const companyDisplay = getCompanyDisplay(company);
  const companyTextX = 20;
  const currencyLabel = getSaleCurrencyLabel(sale);

  let headerStartY = 20;

  if (companyDisplay.logo) {
    try {
      const { width: natW, height: natH } = await getImageDimensions(companyDisplay.logo);
      const { w: logoW, h: logoH } = fitInBox(natW, natH, INVOICE_LOGO_MAX_W, INVOICE_LOGO_MAX_H);
      const logoX = (pageWidth - logoW) / 2;
      const logoY = 15;
      const format = companyDisplay.logo.includes('png') ? 'PNG' : 'JPEG';
      doc.addImage(companyDisplay.logo, format, logoX, logoY, logoW, logoH);
      headerStartY = logoY + logoH + 10;
    } catch (_) {
      // ignore invalid image
    }
  }

  let yPos = headerStartY;

  // En-tête droite : FACTURE, N°, Date
  doc.setFontSize(20);
  doc.setFont('helvetica', 'bold');
  doc.text('FACTURE', pageWidth - 60, yPos);

  yPos += 10;
  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  doc.text(`N° ${sale.invoiceNumber || sale.id}`, pageWidth - 60, yPos);

  yPos += 5;
  const saleDate = new Date(sale.createdAt);
  doc.text(`Date: ${saleDate.toLocaleDateString('fr-FR')}`, pageWidth - 60, yPos);

  // Informations entreprise (gauche)
  yPos = headerStartY;
  doc.setFontSize(14);
  doc.setFont('helvetica', 'bold');
  doc.text(companyDisplay.name || '', companyTextX, yPos);
  
  yPos += 7;
  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  if (companyDisplay.address) {
    doc.text(companyDisplay.address, companyTextX, yPos);
    yPos += 5;
  }
  if (companyDisplay.city) {
    doc.text(companyDisplay.city, companyTextX, yPos);
    yPos += 5;
  }
  if (companyDisplay.phone) {
    doc.text(`Tél: ${companyDisplay.phone}`, companyTextX, yPos);
    yPos += 5;
  }
  if (companyDisplay.email) {
    doc.text(`Email: ${companyDisplay.email}`, companyTextX, yPos);
    yPos += 5;
  }
  if (companyDisplay.siret) {
    doc.text(`SIRET: ${companyDisplay.siret}`, companyTextX, yPos);
    yPos += 5;
  }
  if (companyDisplay.vatNumber) {
    doc.text(`TVA: ${companyDisplay.vatNumber}`, companyTextX, yPos);
    yPos += 5;
  }

  // Informations client
  yPos += 10;
  doc.setFontSize(12);
  doc.setFont('helvetica', 'bold');
  doc.text('FACTURÉ À:', 20, yPos);
  
  yPos += 7;
  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  if (sale.client) {
    if (sale.client.type === ClientType.SOCIETE && sale.client.companyName) {
      doc.text(sale.client.companyName, 20, yPos);
      yPos += 5;
      if (sale.client.vatNumber) {
        doc.text(`TVA: ${sale.client.vatNumber}`, 20, yPos);
        yPos += 5;
      }
    } else {
      const clientName = `${sale.client.firstName || ''} ${sale.client.lastName || ''}`.trim();
      if (clientName) {
        doc.text(clientName, 20, yPos);
        yPos += 5;
      }
    }
    if (sale.client.address) {
      doc.text(sale.client.address, 20, yPos);
      yPos += 5;
    }
    if (sale.client.postalCode && sale.client.city) {
      doc.text(`${sale.client.postalCode} ${sale.client.city}`, 20, yPos);
      yPos += 5;
    }
    if (sale.client.country) {
      doc.text(sale.client.country, 20, yPos);
      yPos += 5;
    }
    if (sale.client.phone) {
      doc.text(`Tél: ${sale.client.phone}`, 20, yPos);
      yPos += 5;
    }
    if (sale.client.email) {
      doc.text(`Email: ${sale.client.email}`, 20, yPos);
    }
  } else {
    doc.text('Particulier', 20, yPos);
  }

  // Tableau des produits
  yPos += 15;
  const tableWidth = pageWidth - 40;
  const colWidths = [80, 20, 30, 30, 30];
  const colX = [20, 100, 120, 150, 180];

  // En-tête du tableau
  doc.setFontSize(10);
  doc.setFont('helvetica', 'bold');
  doc.rect(20, yPos - 5, tableWidth, 8);
  doc.text('Description', colX[0], yPos);
  doc.text('Qté', colX[1], yPos);
  doc.text('Prix unit.', colX[2], yPos);
  doc.text('Remise', colX[3], yPos);
  doc.text('Total', colX[4], yPos);

  yPos += 8;
  doc.setFont('helvetica', 'normal');

  // Lignes de produits
  sale.items.forEach((item) => {
    if (yPos > pageHeight - 40) {
      doc.addPage();
      yPos = 20;
    }

    const productName = item.product?.name || 'Produit supprimé';
    const lines = doc.splitTextToSize(productName, colWidths[0] - 2);
    
    lines.forEach((line: string, index: number) => {
      if (index === 0) {
        doc.rect(20, yPos - 4, tableWidth, 8);
      }
      doc.text(line, colX[0] + 2, yPos + 2);
    });

    const unitStr = (item.product as any)?.unit ? ` ${(item.product as any).unit}` : '';
    doc.text(`${item.quantity}${unitStr}`, colX[1] + 2, yPos + 2);
    doc.text(`${item.unitPrice.toFixed(2)} ${currencyLabel}`, colX[2] + 2, yPos + 2);
    doc.text(`${item.discount.toFixed(2)} ${currencyLabel}`, colX[3] + 2, yPos + 2);
    doc.text(`${item.totalPrice.toFixed(2)} ${currencyLabel}`, colX[4] + 2, yPos + 2, { align: 'right' });

    yPos += Math.max(8, lines.length * 5);
  });

  // Totaux
  yPos += 5;
  const totalsX = pageWidth - 60;
  
  doc.setFontSize(10);
  doc.text('Sous-total HT:', totalsX, yPos, { align: 'right' });
  doc.text(`${sale.subtotal.toFixed(2)} ${currencyLabel}`, pageWidth - 20, yPos, { align: 'right' });
  
  if (sale.discount > 0) {
    yPos += 5;
    doc.text('Remise:', totalsX, yPos, { align: 'right' });
    doc.text(`-${sale.discount.toFixed(2)} ${currencyLabel}`, pageWidth - 20, yPos, { align: 'right' });
  }

  if (sale.tax > 0) {
    yPos += 5;
    doc.text('TVA (20%):', totalsX, yPos, { align: 'right' });
    doc.text(`${sale.tax.toFixed(2)} ${currencyLabel}`, pageWidth - 20, yPos, { align: 'right' });
  }

  yPos += 5;
  doc.setFontSize(12);
  doc.setFont('helvetica', 'bold');
  doc.text('TOTAL TTC:', totalsX, yPos, { align: 'right' });
  doc.text(`${sale.total.toFixed(2)} ${currencyLabel}`, pageWidth - 20, yPos, { align: 'right' });

  // Tampon IMPAYÉ / PAYÉ selon montant payé
  const paid = Number(sale.amountPaid ?? 0);
  const totalNum = Number(sale.total);
  const isPaid = totalNum <= 0 || paid >= totalNum - 0.01;
  doc.setFontSize(22);
  doc.setFont('helvetica', 'bold');
  const stampX = pageWidth - 55;
  const stampY = 50;
  doc.setTextColor(isPaid ? 0 : 200, isPaid ? 140 : 0, isPaid ? 0 : 0);
  doc.rect(stampX - 2, stampY - 8, 38, 14, 'S');
  doc.text(isPaid ? 'PAYÉ' : 'IMPAYÉ', stampX + 17, stampY + 2, { align: 'center' });
  doc.setTextColor(0, 0, 0);

  // Paiement
  yPos += 10;
  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  const paymentLabel = getPaymentMethodLabelInvoice(sale.paymentMethod);
  doc.text(`Mode de paiement: ${paymentLabel}`, 20, yPos);
  
  if (sale.cashAmount) {
    yPos += 5;
    doc.text(`Espèces: ${sale.cashAmount.toFixed(2)} ${currencyLabel}`, 20, yPos);
  }
  if (sale.cardAmount) {
    yPos += 5;
    doc.text(`Carte: ${sale.cardAmount.toFixed(2)} ${currencyLabel}`, 20, yPos);
  }

  // Mentions légales
  yPos = pageHeight - 30;
  doc.setFontSize(8);
  doc.text('Conditions de paiement: 30 jours net', 20, yPos);
  yPos += 4;
  doc.text('En cas de retard de paiement, des pénalités de 3 fois le taux légal seront appliquées.', 20, yPos);
  yPos += 4;
  doc.text(`Une indemnité forfaitaire pour frais de recouvrement (voir conditions) sera due en cas de retard.`, 20, yPos);

  // Vendeur
  if (sale.user) {
    yPos += 8;
    doc.setFontSize(9);
    doc.text(`Vendeur: ${sale.user.firstName} ${sale.user.lastName}`, 20, yPos);
  }

  doc.save(`facture-${sale.invoiceNumber || sale.id}.pdf`);
}

function getQuoteCurrencyLabel(quote: { currencyCode?: string | null }): string {
  return getSaleCurrencyLabel(quote);
}

/**
 * Génère le PDF d'un devis (quote).
 */
export async function generateQuote(quote: Quote, company?: CompanyInfo | null) {
  const doc = new jsPDF();
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const companyDisplay = getCompanyDisplay(company);
  const companyTextX = 20;
  const currencyLabel = getQuoteCurrencyLabel(quote);

  let headerStartY = 20;
  if (companyDisplay.logo) {
    try {
      const { width: natW, height: natH } = await getImageDimensions(companyDisplay.logo);
      const { w: logoW, h: logoH } = fitInBox(natW, natH, INVOICE_LOGO_MAX_W, INVOICE_LOGO_MAX_H);
      const logoX = (pageWidth - logoW) / 2;
      const format = companyDisplay.logo.includes('png') ? 'PNG' : 'JPEG';
      doc.addImage(companyDisplay.logo, format, logoX, 15, logoW, logoH);
      headerStartY = 15 + logoH + 10;
    } catch (_) {}
  }

  let yPos = headerStartY;
  doc.setFontSize(20);
  doc.setFont('helvetica', 'bold');
  doc.text('DEVIS', pageWidth - 50, yPos);
  yPos += 8;
  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  doc.text(`N° ${quote.quoteNumber}`, pageWidth - 50, yPos);
  yPos += 5;
  doc.text(`Date: ${new Date(quote.createdAt).toLocaleDateString('fr-FR')}`, pageWidth - 50, yPos);
  if (quote.validUntil) {
    yPos += 5;
    doc.text(`Valide jusqu'au: ${new Date(quote.validUntil).toLocaleDateString('fr-FR')}`, pageWidth - 50, yPos);
  }

  yPos = headerStartY;
  doc.setFontSize(14);
  doc.setFont('helvetica', 'bold');
  doc.text(companyDisplay.name || '', companyTextX, yPos);
  yPos += 7;
  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  if (companyDisplay.address) doc.text(companyDisplay.address, companyTextX, yPos), (yPos += 5);
  if (companyDisplay.city) doc.text(companyDisplay.city, companyTextX, yPos), (yPos += 5);
  if (companyDisplay.phone) doc.text(`Tél: ${companyDisplay.phone}`, companyTextX, yPos), (yPos += 5);
  if (companyDisplay.email) doc.text(`Email: ${companyDisplay.email}`, companyTextX, yPos), (yPos += 5);

  yPos += 10;
  doc.setFontSize(12);
  doc.setFont('helvetica', 'bold');
  doc.text('CLIENT:', 20, yPos);
  yPos += 7;
  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  if (quote.client) {
    const name = quote.client.companyName || `${quote.client.firstName || ''} ${quote.client.lastName || ''}`.trim() || 'Client';
    doc.text(name, 20, yPos);
    yPos += 5;
    if (quote.client.address) doc.text(quote.client.address, 20, yPos), (yPos += 5);
    if (quote.client.phone) doc.text(`Tél: ${quote.client.phone}`, 20, yPos), (yPos += 5);
    if (quote.client.email) doc.text(`Email: ${quote.client.email}`, 20, yPos), (yPos += 5);
  } else {
    doc.text('Non assigné', 20, yPos);
  }

  yPos += 12;
  const tableWidth = pageWidth - 40;
  const colX = [20, 100, 120, 150, 180];
  doc.setFont('helvetica', 'bold');
  doc.rect(20, yPos - 5, tableWidth, 8);
  doc.text('Description', colX[0], yPos);
  doc.text('Qté', colX[1], yPos);
  doc.text('Prix unit.', colX[2], yPos);
  doc.text('Remise', colX[3], yPos);
  doc.text('Total', colX[4], yPos);
  yPos += 8;
  doc.setFont('helvetica', 'normal');

  quote.items.forEach((item) => {
    if (yPos > pageHeight - 50) {
      doc.addPage();
      yPos = 20;
    }
    const name = item.product?.name || 'Produit';
    const lines = doc.splitTextToSize(name, 76);
    lines.forEach((line: string, i: number) => {
      if (i === 0) doc.rect(20, yPos - 4, tableWidth, 8);
      doc.text(line, colX[0] + 2, yPos + 2);
    });
    doc.text(String(item.quantity), colX[1] + 2, yPos + 2);
    doc.text(`${Number(item.unitPrice).toFixed(2)} ${currencyLabel}`, colX[2] + 2, yPos + 2);
    doc.text(`${Number(item.discount).toFixed(2)} ${currencyLabel}`, colX[3] + 2, yPos + 2);
    doc.text(`${Number(item.totalPrice).toFixed(2)} ${currencyLabel}`, colX[4] + 2, yPos + 2, { align: 'right' });
    yPos += Math.max(8, lines.length * 5);
  });

  yPos += 6;
  const totalsX = pageWidth - 60;
  doc.text('Sous-total HT:', totalsX, yPos, { align: 'right' });
  doc.text(`${Number(quote.subtotal).toFixed(2)} ${currencyLabel}`, pageWidth - 20, yPos, { align: 'right' });
  if (Number(quote.discount) > 0) {
    yPos += 5;
    doc.text('Remise:', totalsX, yPos, { align: 'right' });
    doc.text(`-${Number(quote.discount).toFixed(2)} ${currencyLabel}`, pageWidth - 20, yPos, { align: 'right' });
  }
  if (Number(quote.tax) > 0) {
    yPos += 5;
    doc.text('TVA (20%):', totalsX, yPos, { align: 'right' });
    doc.text(`${Number(quote.tax).toFixed(2)} ${currencyLabel}`, pageWidth - 20, yPos, { align: 'right' });
  }
  yPos += 5;
  doc.setFontSize(12);
  doc.setFont('helvetica', 'bold');
  doc.text('TOTAL TTC:', totalsX, yPos, { align: 'right' });
  doc.text(`${Number(quote.total).toFixed(2)} ${currencyLabel}`, pageWidth - 20, yPos, { align: 'right' });

  if (quote.notes) {
    yPos += 12;
    doc.setFontSize(9);
    doc.setFont('helvetica', 'normal');
    doc.text('Notes: ' + quote.notes, 20, yPos, { maxWidth: pageWidth - 40 });
  }

  doc.save(`devis-${quote.quoteNumber}.pdf`);
}

/**
 * Génère le PDF d'un avoir (note de crédit) — conforme aux usages tunisiens :
 * référence à la facture/ticket d'origine, numéro d'avoir, date, client, désignation des biens, montants HT/TVA/TTC.
 */
export async function generateAvoir(
  refund: SaleRefund,
  sale: Sale,
  company?: CompanyInfo | null,
) {
  const doc = new jsPDF();
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const companyDisplay = getCompanyDisplay(company);
  const companyTextX = 20;

  const items = (refund.refundedItems || []) as RefundItemLine[];
  const subtotal = items.reduce((s, i) => s + Number(i.totalPrice), 0);
  const taxRate = sale.type === SaleType.INVOICE ? 0.2 : 0;
  const tax = subtotal * taxRate;
  const total = subtotal + tax;
  const currencyLabel = getSaleCurrencyLabel(sale);

  let headerStartY = 20;
  if (companyDisplay.logo) {
    try {
      const { width: natW, height: natH } = await getImageDimensions(companyDisplay.logo);
      const { w: logoW, h: logoH } = fitInBox(natW, natH, INVOICE_LOGO_MAX_W, INVOICE_LOGO_MAX_H);
      const logoX = (pageWidth - logoW) / 2;
      const logoY = 15;
      const format = companyDisplay.logo.includes('png') ? 'PNG' : 'JPEG';
      doc.addImage(companyDisplay.logo, format, logoX, logoY, logoW, logoH);
      headerStartY = logoY + logoH + 10;
    } catch (_) {}
  }

  const formatDateSafe = (d: string | Date | null | undefined): string => {
    if (d == null) return '-';
    const t = new Date(d);
    return isNaN(t.getTime()) ? '-' : t.toLocaleDateString('fr-FR');
  };

  let yPos = headerStartY;

  // Titre : NOTE DE CRÉDIT (AVOIR) — centré en haut, taille réduite pour rester dans la page
  doc.setFontSize(14);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(180, 0, 0);
  doc.text('NOTE DE CRÉDIT (AVOIR)', pageWidth / 2, yPos, { align: 'center' });

  yPos += 10;
  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(0, 0, 0);
  const rightBlockX = pageWidth - 20;
  doc.text(`N° Avoir: ${refund.avoirNumber || refund.id}`, rightBlockX, yPos, { align: 'right' });
  yPos += 5;
  doc.text(`Date: ${formatDateSafe(refund.createdAt)}`, rightBlockX, yPos, { align: 'right' });
  yPos += 6;
  doc.setFont('helvetica', 'bold');
  const refOrig = sale.invoiceNumber || sale.ticketNumber || sale.id;
  doc.text(`Référence facture d'origine: ${refOrig}`, rightBlockX, yPos, { align: 'right' });
  yPos += 5;
  doc.setFont('helvetica', 'normal');
  doc.text(`Date facture: ${formatDateSafe(sale.createdAt)}`, rightBlockX, yPos, { align: 'right' });

  // Société (gauche)
  yPos = headerStartY;
  doc.setFontSize(14);
  doc.setFont('helvetica', 'bold');
  doc.text(companyDisplay.name || '', companyTextX, yPos);
  yPos += 7;
  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  if (companyDisplay.address) {
    doc.text(companyDisplay.address, companyTextX, yPos);
    yPos += 5;
  }
  if (companyDisplay.city) {
    doc.text(companyDisplay.city, companyTextX, yPos);
    yPos += 5;
  }
  if (companyDisplay.vatNumber) {
    doc.text(`TVA: ${companyDisplay.vatNumber}`, companyTextX, yPos);
    yPos += 5;
  }

  // Client
  yPos += 8;
  doc.setFontSize(12);
  doc.setFont('helvetica', 'bold');
  doc.text('CLIENT (bénéficiaire de l\'avoir):', 20, yPos);
  yPos += 7;
  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  if (sale.client) {
    const name =
      sale.client.type === ClientType.SOCIETE && sale.client.companyName
        ? sale.client.companyName
        : `${sale.client.firstName || ''} ${sale.client.lastName || ''}`.trim() || 'Particulier';
    doc.text(name, 20, yPos);
    yPos += 5;
    if (sale.client.address) {
      doc.text(sale.client.address, 20, yPos);
      yPos += 5;
    }
    if (sale.client.vatNumber) {
      doc.text(`TVA: ${sale.client.vatNumber}`, 20, yPos);
      yPos += 5;
    }
  } else {
    doc.text('Particulier', 20, yPos);
    yPos += 5;
  }

  if (refund.reason) {
    yPos += 5;
    doc.setFont('helvetica', 'bold');
    doc.text('Motif:', 20, yPos);
    yPos += 5;
    doc.setFont('helvetica', 'normal');
    doc.text(refund.reason, 20, yPos);
    yPos += 8;
  }

  // Tableau des lignes
  yPos += 10;
  const tableWidth = pageWidth - 40;
  const colX = [20, 100, 120, 150, 180];

  doc.setFontSize(10);
  doc.setFont('helvetica', 'bold');
  doc.rect(20, yPos - 5, tableWidth, 8);
  doc.text('Désignation', colX[0], yPos);
  doc.text('Qté', colX[1], yPos);
  doc.text('Prix unit. HT', colX[2], yPos);
  doc.text('Total HT', colX[4], yPos);
  yPos += 8;
  doc.setFont('helvetica', 'normal');

  items.forEach((item) => {
    if (yPos > pageHeight - 50) {
      doc.addPage();
      yPos = 20;
    }
    const productName = item.productName || 'Produit';
    const lines = doc.splitTextToSize(productName, 75);
    lines.forEach((line: string, idx: number) => {
      if (idx === 0) doc.rect(20, yPos - 4, tableWidth, 8);
      doc.text(line, colX[0] + 2, yPos + 2);
    });
    doc.text(String(item.quantity), colX[1] + 2, yPos + 2);
    doc.text(`${Number(item.unitPrice).toFixed(2)} ${currencyLabel}`, colX[2] + 2, yPos + 2);
    doc.text(`${Number(item.totalPrice).toFixed(2)} ${currencyLabel}`, colX[4] + 2, yPos + 2, { align: 'right' });
    yPos += Math.max(8, lines.length * 5);
  });

  yPos += 5;
  const totalsX = pageWidth - 60;
  doc.text('Sous-total HT:', totalsX, yPos, { align: 'right' });
  doc.text(`${subtotal.toFixed(2)} ${currencyLabel}`, pageWidth - 20, yPos, { align: 'right' });
  if (tax > 0) {
    yPos += 5;
    doc.text('TVA (20%):', totalsX, yPos, { align: 'right' });
    doc.text(`${tax.toFixed(2)} ${currencyLabel}`, pageWidth - 20, yPos, { align: 'right' });
  }
  yPos += 5;
  doc.setFont('helvetica', 'bold');
  doc.text('Total TTC (crédit):', totalsX, yPos, { align: 'right' });
  doc.text(`${total.toFixed(2)} ${currencyLabel}`, pageWidth - 20, yPos, { align: 'right' });

  yPos = pageHeight - 28;
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.text(
    'Document tenant lieu de facture. Référence à la facture d\'origine obligatoire (art. 18 Code TVA Tunisie).',
    20,
    yPos,
  );
  yPos += 4;
  doc.text('Cet avoir annule ou réduit la créance correspondante.', 20, yPos);

  doc.save(`avoir-${refund.avoirNumber || refund.id}.pdf`);
}

export async function generateTicket(sale: Sale, company?: CompanyInfo | null) {
  const doc = new jsPDF({
    format: [80, 200], // Format ticket standard (80mm de largeur)
    unit: 'mm',
  });

  const pageWidth = doc.internal.pageSize.getWidth();
  const companyDisplay = getCompanyDisplay(company);
  const currencyLabel = getSaleCurrencyLabel(sale);
  let yPos = 10;

  if (companyDisplay.logo) {
    try {
      const { width: natW, height: natH } = await getImageDimensions(companyDisplay.logo);
      const { w: logoW, h: logoH } = fitInBox(natW, natH, TICKET_LOGO_MAX_W, TICKET_LOGO_MAX_H);
      const logoX = (pageWidth - logoW) / 2;
      const logoY = 5;
      const format = companyDisplay.logo.includes('png') ? 'PNG' : 'JPEG';
      doc.addImage(companyDisplay.logo, format, logoX, logoY, logoW, logoH);
      yPos = logoY + logoH + 6;
    } catch (_) {
      // ignore
    }
  }

  // En-tête
  doc.setFontSize(16);
  doc.setFont('helvetica', 'bold');
  doc.text(companyDisplay.name || 'Manage PME', pageWidth / 2, yPos, { align: 'center' });
  
  yPos += 5;
  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  if (companyDisplay.address) {
    doc.text(companyDisplay.address, pageWidth / 2, yPos, { align: 'center' });
    yPos += 4;
  }
  if (companyDisplay.city) {
    doc.text(companyDisplay.city, pageWidth / 2, yPos, { align: 'center' });
    yPos += 4;
  }
  if (companyDisplay.phone) {
    doc.text(`Tél: ${companyDisplay.phone}`, pageWidth / 2, yPos, { align: 'center' });
    yPos += 4;
  }

  // Ligne de séparation
  yPos += 5;
  doc.line(10, yPos, pageWidth - 10, yPos);

  // Numéro de ticket et date
  yPos += 5;
  doc.setFontSize(10);
  doc.setFont('helvetica', 'bold');
  doc.text(`TICKET N° ${sale.ticketNumber || sale.id}`, pageWidth / 2, yPos, { align: 'center' });
  
  yPos += 4;
  doc.setFontSize(8);
  doc.setFont('helvetica', 'normal');
  const saleDate = new Date(sale.createdAt);
  doc.text(saleDate.toLocaleString('fr-FR'), pageWidth / 2, yPos, { align: 'center' });

  // Ligne de séparation
  yPos += 5;
  doc.line(10, yPos, pageWidth - 10, yPos);

  // Produits
  yPos += 5;
  sale.items.forEach((item) => {
    const productName = item.product?.name || 'Produit supprimé';
    const lines = doc.splitTextToSize(productName, pageWidth - 20);
    
    lines.forEach((line: string) => {
      doc.setFontSize(9);
      doc.text(line, 10, yPos);
      yPos += 4;
    });

    doc.setFontSize(8);
    const unitStr = (item.product as any)?.unit ? ` ${(item.product as any).unit}` : '';
    const lineText = `${item.quantity}${unitStr} x ${item.unitPrice.toFixed(2)} ${currencyLabel}`;
    if (item.discount > 0) {
      doc.text(`${lineText} - Remise: ${item.discount.toFixed(2)} ${currencyLabel}`, 10, yPos);
    } else {
      doc.text(lineText, 10, yPos);
    }
    yPos += 3;
    doc.text(`Total: ${item.totalPrice.toFixed(2)} ${currencyLabel}`, pageWidth - 10, yPos, { align: 'right' });
    yPos += 5;
  });

  // Ligne de séparation
  yPos += 2;
  doc.line(10, yPos, pageWidth - 10, yPos);

  // Totaux
  yPos += 5;
  doc.setFontSize(9);
  doc.text('Sous-total:', 10, yPos);
  doc.text(`${sale.subtotal.toFixed(2)} ${currencyLabel}`, pageWidth - 10, yPos, { align: 'right' });

  if (sale.discount > 0) {
    yPos += 4;
    doc.text('Remise:', 10, yPos);
    doc.text(`-${sale.discount.toFixed(2)} ${currencyLabel}`, pageWidth - 10, yPos, { align: 'right' });
  }

  if (sale.tax > 0) {
    yPos += 4;
    doc.text('TVA:', 10, yPos);
    doc.text(`${sale.tax.toFixed(2)} ${currencyLabel}`, pageWidth - 10, yPos, { align: 'right' });
  }

  yPos += 4;
  doc.setFontSize(11);
  doc.setFont('helvetica', 'bold');
  doc.text('TOTAL:', 10, yPos);
  doc.text(`${sale.total.toFixed(2)} ${currencyLabel}`, pageWidth - 10, yPos, { align: 'right' });

  // Paiement
  yPos += 6;
  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  const paymentLabel = getPaymentMethodLabelTicket(sale.paymentMethod);
  doc.text(`Paiement: ${paymentLabel}`, pageWidth / 2, yPos, { align: 'center' });

  if (sale.cashAmount) {
    yPos += 4;
    doc.text(`Espèces: ${sale.cashAmount.toFixed(2)} ${currencyLabel}`, pageWidth / 2, yPos, { align: 'center' });
  }
  if (sale.cardAmount) {
    yPos += 4;
    doc.text(`Carte: ${sale.cardAmount.toFixed(2)} ${currencyLabel}`, pageWidth / 2, yPos, { align: 'center' });
  }

  // Ligne de séparation
  yPos += 5;
  doc.line(10, yPos, pageWidth - 10, yPos);

  // Message de remerciement
  yPos += 5;
  doc.setFontSize(10);
  doc.setFont('helvetica', 'bold');
  doc.text('Merci de votre visite !', pageWidth / 2, yPos, { align: 'center' });

  // Vendeur
  if (sale.user) {
    yPos += 4;
    doc.setFontSize(8);
    doc.setFont('helvetica', 'normal');
    doc.text(`Vendeur: ${sale.user.firstName} ${sale.user.lastName}`, pageWidth / 2, yPos, { align: 'center' });
  }

  doc.save(`ticket-${sale.ticketNumber || sale.id}.pdf`);
}

function getPaymentMethodLabelInvoice(method: PaymentMethod): string {
  const labels: Record<string, string> = {
    [PaymentMethod.CASH]: 'Espèces',
    [PaymentMethod.CARD]: 'Carte bancaire',
    [PaymentMethod.MIXED]: 'Mixte',
    [PaymentMethod.CREDIT]: 'À crédit',
  };
  return labels[method] ?? method;
}

function getPaymentMethodLabelTicket(method: PaymentMethod): string {
  const labels: Record<string, string> = {
    [PaymentMethod.CASH]: 'Espèces',
    [PaymentMethod.CARD]: 'Carte bancaire',
    [PaymentMethod.MIXED]: 'Mixte',
    [PaymentMethod.CREDIT]: 'À crédit',
  };
  return labels[method] ?? method;
}

/**
 * Génère le PDF "Demande de crédit" / "Accord de crédit" pour une vente à crédit :
 * référence facture, client, montant, échéance, conditions, zone signature client.
 */
export async function generateCreditRequest(sale: Sale, company?: CompanyInfo | null) {
  const doc = new jsPDF();
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const companyDisplay = getCompanyDisplay(company);
  const currencyLabel = getSaleCurrencyLabel(sale);

  let yPos = 25;

  if (companyDisplay.logo) {
    try {
      const { width: natW, height: natH } = await getImageDimensions(companyDisplay.logo);
      const { w: logoW, h: logoH } = fitInBox(natW, natH, INVOICE_LOGO_MAX_W, INVOICE_LOGO_MAX_H);
      const logoX = (pageWidth - logoW) / 2;
      doc.addImage(companyDisplay.logo, companyDisplay.logo.includes('png') ? 'PNG' : 'JPEG', logoX, 12, logoW, logoH);
      yPos = 18 + logoH + 12;
    } catch (_) {}
  }

  doc.setFontSize(16);
  doc.setFont('helvetica', 'bold');
  doc.text('DEMANDE DE CRÉDIT / ACCORD DE CRÉDIT', pageWidth / 2, yPos, { align: 'center' });
  yPos += 14;

  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  doc.text(`Référence facture: ${sale.invoiceNumber || sale.ticketNumber || sale.id}`, 20, yPos);
  yPos += 6;
  doc.text(`Date de la vente: ${new Date(sale.createdAt).toLocaleDateString('fr-FR')}`, 20, yPos);
  yPos += 10;

  doc.setFont('helvetica', 'bold');
  doc.text('Client:', 20, yPos);
  yPos += 6;
  doc.setFont('helvetica', 'normal');
  if (sale.client) {
    const name =
      sale.client.type === ClientType.SOCIETE && sale.client.companyName
        ? sale.client.companyName
        : `${sale.client.firstName || ''} ${sale.client.lastName || ''}`.trim() || 'Particulier';
    doc.text(name, 20, yPos);
    yPos += 5;
    if (sale.client.address) {
      doc.text(sale.client.address, 20, yPos);
      yPos += 5;
    }
    if (sale.client.phone) doc.text(`Tél: ${sale.client.phone}`, 20, yPos);
  } else {
    doc.text('Particulier', 20, yPos);
  }
  yPos += 10;

  doc.setFont('helvetica', 'bold');
  doc.text(`Montant total dû: ${sale.total.toFixed(2)} ${currencyLabel}`, 20, yPos);
  yPos += 8;
  const due = sale.dueDate ? new Date(sale.dueDate).toLocaleDateString('fr-FR') : 'À définir';
  doc.text(`Échéance convenue: ${due}`, 20, yPos);
  yPos += 12;

  doc.setFontSize(9);
  doc.text(
    'Le client s\'engage à régler la somme indiquée ci-dessus à la date d\'échéance. En cas de retard, des pénalités pourront être appliquées selon les conditions en vigueur.',
    20,
    yPos,
    { maxWidth: pageWidth - 40 },
  );
  yPos += 18;

  doc.setFont('helvetica', 'bold');
  doc.text('Signature du client (précédée de la mention « Lu et approuvé »):', 20, yPos);
  yPos += 8;
  doc.setFont('helvetica', 'normal');
  doc.rect(20, yPos, pageWidth - 40, 25);
  doc.setFontSize(8);
  doc.setTextColor(100, 100, 100);
  doc.text('Signature et date', 24, yPos + 14);
  doc.setTextColor(0, 0, 0);
  yPos += 35;

  doc.setFontSize(8);
  doc.text(`Document généré le ${new Date().toLocaleDateString('fr-FR')} - ${companyDisplay.name || ''}`, pageWidth / 2, pageHeight - 15, { align: 'center' });

  doc.save(`demande-credit-${sale.invoiceNumber || sale.id}.pdf`);
}

