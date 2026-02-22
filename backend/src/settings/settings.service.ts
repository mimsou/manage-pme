import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

export const SETTING_KEYS = {
  /** Seuil en jours : factures impayées depuis X jours (notification crédits clients). */
  CREDIT_OVERDUE_DAYS_THRESHOLD: 'credit_overdue_days_threshold',
} as const;

const DEFAULTS: Record<string, string> = {
  [SETTING_KEYS.CREDIT_OVERDUE_DAYS_THRESHOLD]: '30',
};

@Injectable()
export class SettingsService {
  constructor(private readonly prisma: PrismaService) {}

  async get(key: string): Promise<string | null> {
    const row = await (this.prisma as any).appSetting.findUnique({
      where: { key },
    });
    return row?.value ?? DEFAULTS[key] ?? null;
  }

  async getNumber(key: string, defaultValue: number): Promise<number> {
    const raw = await this.get(key);
    if (raw == null || raw === '') return defaultValue;
    const n = parseInt(raw, 10);
    return Number.isFinite(n) ? n : defaultValue;
  }

  async set(key: string, value: string): Promise<void> {
    await (this.prisma as any).appSetting.upsert({
      where: { key },
      update: { value },
      create: { key, value },
    });
  }

  async getAll(): Promise<Record<string, string>> {
    const rows = await (this.prisma as any).appSetting.findMany();
    const out: Record<string, string> = { ...DEFAULTS };
    for (const row of rows) {
      out[row.key] = row.value;
    }
    return out;
  }
}
