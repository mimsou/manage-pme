import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { SaleStatus } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';

export interface ClientCreditSummary {
  id: string;
  firstName: string | null;
  lastName: string | null;
  companyName: string | null;
  email: string | null;
  phone: string | null;
  totalDue: number;
  unpaidCount: number;
}

export interface UnpaidSaleRow {
  id: string;
  ticketNumber: string | null;
  invoiceNumber: string | null;
  type: string;
  total: number;
  amountPaid: number;
  due: number;
  dueDate: Date | null;
  createdAt: Date;
  daysOverdue: number | null;
  currencyCode: string | null;
}

@Injectable()
export class CreditsService {
  constructor(private prisma: PrismaService) {}

  async getClientCreditsSummary(filters: {
    clientId?: string;
    minTotal?: number;
    maxTotal?: number;
    search?: string;
    page?: number;
    limit?: number;
    overdueMinDays?: number;
  }) {
    try {
      const page = filters.page ?? 1;
      const limit = filters.limit ?? 20;
      const skip = (page - 1) * limit;

      const whereSale: { clientId: unknown; status: SaleStatus } = {
        clientId: { not: null },
        status: SaleStatus.COMPLETED,
      };
      if (filters.clientId) whereSale.clientId = filters.clientId;

      const unpaidSales = await this.prisma.sale.findMany({
        where: whereSale,
        select: {
          id: true,
          clientId: true,
          total: true,
          amountPaid: true,
          dueDate: true,
          createdAt: true,
          client: true,
        },
      });

      const now = new Date();
      const byClient = new Map<string, { client: { firstName: string | null; lastName: string | null; companyName: string | null; email: string | null; phone: string | null } | null; totalDue: number; count: number }>();
      for (const s of unpaidSales) {
        const due = Number(s.total) - Number(s.amountPaid);
        if (!s.clientId || due <= 0) continue;
        const refDate = s.dueDate ? new Date(s.dueDate) : new Date(s.createdAt);
        const daysOverdue = Math.floor((now.getTime() - refDate.getTime()) / (24 * 60 * 60 * 1000));
        if (filters.overdueMinDays != null && filters.overdueMinDays > 0 && daysOverdue < filters.overdueMinDays) continue;
        const existing = byClient.get(s.clientId);
        if (!existing) {
          byClient.set(s.clientId, {
            client: s.client,
            totalDue: due,
            count: 1,
          });
        } else {
          existing.totalDue += due;
          existing.count += 1;
        }
      }

    let list = Array.from(byClient.entries()).map(([id, v]) => ({
      id,
      firstName: v.client?.firstName ?? null,
      lastName: v.client?.lastName ?? null,
      companyName: v.client?.companyName ?? null,
      email: v.client?.email ?? null,
      phone: v.client?.phone ?? null,
      totalDue: Math.round(v.totalDue * 100) / 100,
      unpaidCount: v.count,
    }));

    if (filters.search) {
      const q = filters.search.toLowerCase();
      list = list.filter(
        (c) =>
          (c.firstName?.toLowerCase().includes(q) ||
            c.lastName?.toLowerCase().includes(q) ||
            c.companyName?.toLowerCase().includes(q) ||
            c.email?.toLowerCase().includes(q) ||
            c.phone?.toLowerCase().includes(q)),
      );
    }
    if (filters.minTotal != null) list = list.filter((c) => c.totalDue >= filters.minTotal!);
    if (filters.maxTotal != null) list = list.filter((c) => c.totalDue <= filters.maxTotal!);

    list.sort((a, b) => b.totalDue - a.totalDue);
    const total = list.length;
    const data = list.slice(skip, skip + limit);

      return {
        data,
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      };
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      if (msg.includes('amountPaid') || msg.includes('amount_paid') || msg.includes('column')) {
        throw new BadRequestException(
          'Les colonnes crédit client (amountPaid, dueDate) sont absentes. Exécutez: npx prisma migrate deploy',
        );
      }
      throw err;
    }
  }

  async getClientCreditDetail(clientId: string) {
    try {
      const client = await this.prisma.client.findUnique({
        where: { id: clientId },
      });
      if (!client) throw new NotFoundException('Client non trouvé');

      const sales = await this.prisma.sale.findMany({
        where: { clientId, status: SaleStatus.COMPLETED },
        include: { items: { include: { product: true } } },
        orderBy: { createdAt: 'asc' },
      });

      const now = new Date();
      const unpaid: UnpaidSaleRow[] = [];
      let totalDue = 0;

      for (const s of sales) {
        const paid = Number(s.amountPaid);
        const total = Number(s.total);
        const due = total - paid;
        if (due <= 0) continue;

        totalDue += due;
        const refDate = s.dueDate ? new Date(s.dueDate) : new Date(s.createdAt);
        const daysOverdue = Math.floor((now.getTime() - refDate.getTime()) / (24 * 60 * 60 * 1000));

        unpaid.push({
          id: s.id,
          ticketNumber: s.ticketNumber,
          invoiceNumber: s.invoiceNumber,
          type: s.type,
          total,
          amountPaid: paid,
          due,
          dueDate: s.dueDate,
          createdAt: s.createdAt,
          daysOverdue: daysOverdue > 0 ? daysOverdue : null,
          currencyCode: s.currencyCode,
        });
      }

      return {
        client: {
          id: client.id,
          type: client.type,
          firstName: client.firstName,
          lastName: client.lastName,
          companyName: client.companyName,
          email: client.email,
          phone: client.phone,
          address: client.address,
          city: client.city,
        },
        totalDue: Math.round(totalDue * 100) / 100,
        unpaidSales: unpaid,
      };
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      if (msg.includes('amountPaid') || msg.includes('amount_paid') || msg.includes('column')) {
        throw new BadRequestException(
          'Les colonnes crédit client (amountPaid, dueDate) sont absentes. Exécutez: npx prisma migrate deploy',
        );
      }
      throw err;
    }
  }

  /** Nombre de factures/tickets impayés depuis au moins X jours (pour badge notification). */
  async getOverdueCount(days: number): Promise<{ count: number; thresholdDays: number }> {
    try {
      const sales = await this.prisma.sale.findMany({
        where: {
          clientId: { not: null },
          status: SaleStatus.COMPLETED,
        },
        select: { total: true, amountPaid: true, dueDate: true, createdAt: true },
      });
      const now = new Date();
      let count = 0;
      for (const s of sales) {
        const due = Number(s.total) - Number(s.amountPaid);
        if (due <= 0) continue;
        const refDate = s.dueDate ? new Date(s.dueDate) : new Date(s.createdAt);
        const daysOverdue = Math.floor((now.getTime() - refDate.getTime()) / (24 * 60 * 60 * 1000));
        if (daysOverdue >= days) count += 1;
      }
      return { count, thresholdDays: days };
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      if (msg.includes('amountPaid') || msg.includes('amount_paid') || msg.includes('column')) {
        throw new BadRequestException(
          'Les colonnes crédit client (amountPaid, dueDate) sont absentes. Exécutez: npx prisma migrate deploy',
        );
      }
      throw err;
    }
  }
}
