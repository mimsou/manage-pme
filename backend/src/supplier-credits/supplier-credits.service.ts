import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PurchaseStatus } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';

export interface SupplierPayableSummary {
  id: string;
  name: string;
  email: string | null;
  phone: string | null;
  totalDue: number;
  unpaidCount: number;
}

export interface UnpaidPurchaseRow {
  id: string;
  reference: string;
  documentType: string;
  supplierDeliveryNoteNumber: string | null;
  invoiceNumber: string | null;
  total: number;
  amountPaid: number;
  due: number;
  dueDate: Date | null;
  invoiceDate: Date | null;
  createdAt: Date;
  daysOverdue: number | null;
  status: string;
}

const EXCLUDED: PurchaseStatus[] = [PurchaseStatus.CANCELLED, PurchaseStatus.RETURNED];

@Injectable()
export class SupplierCreditsService {
  constructor(private prisma: PrismaService) {}

  async getSupplierPayablesSummary(filters: {
    supplierId?: string;
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

      const wherePurchase: {
        status: { notIn: PurchaseStatus[] };
        supplierId?: string;
      } = {
        status: { notIn: EXCLUDED },
      };
      if (filters.supplierId) wherePurchase.supplierId = filters.supplierId;

      const purchases = await this.prisma.purchase.findMany({
        where: wherePurchase,
        select: {
          id: true,
          supplierId: true,
          totalAmount: true,
          amountPaid: true,
          dueDate: true,
          createdAt: true,
          supplier: {
            select: {
              id: true,
              name: true,
              email: true,
              phone: true,
            },
          },
        },
      });

      const now = new Date();
      const bySupplier = new Map<
        string,
        {
          supplier: { name: string; email: string | null; phone: string | null };
          totalDue: number;
          count: number;
        }
      >();

      for (const p of purchases) {
        const due = Number(p.totalAmount) - Number(p.amountPaid);
        if (due <= 0) continue;
        const refDate = p.dueDate ? new Date(p.dueDate) : new Date(p.createdAt);
        const daysOverdue = Math.floor(
          (now.getTime() - refDate.getTime()) / (24 * 60 * 60 * 1000),
        );
        if (
          filters.overdueMinDays != null &&
          filters.overdueMinDays > 0 &&
          daysOverdue < filters.overdueMinDays
        ) {
          continue;
        }
        const existing = bySupplier.get(p.supplierId);
        if (!existing) {
          bySupplier.set(p.supplierId, {
            supplier: {
              name: p.supplier.name,
              email: p.supplier.email,
              phone: p.supplier.phone,
            },
            totalDue: due,
            count: 1,
          });
        } else {
          existing.totalDue += due;
          existing.count += 1;
        }
      }

      let list: SupplierPayableSummary[] = Array.from(bySupplier.entries()).map(([id, v]) => ({
        id,
        name: v.supplier.name,
        email: v.supplier.email,
        phone: v.supplier.phone,
        totalDue: Math.round(v.totalDue * 100) / 100,
        unpaidCount: v.count,
      }));

      if (filters.search) {
        const q = filters.search.toLowerCase();
        list = list.filter(
          (s) =>
            s.name.toLowerCase().includes(q) ||
            (s.email?.toLowerCase().includes(q) ?? false) ||
            (s.phone?.toLowerCase().includes(q) ?? false),
        );
      }
      if (filters.minTotal != null) list = list.filter((s) => s.totalDue >= filters.minTotal!);
      if (filters.maxTotal != null) list = list.filter((s) => s.totalDue <= filters.maxTotal!);

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
          'Colonnes achat (amountPaid, dueDate) absentes. Exécutez: npx prisma migrate deploy',
        );
      }
      throw err;
    }
  }

  async getSupplierPayableDetail(supplierId: string) {
    try {
      const supplier = await this.prisma.supplier.findUnique({
        where: { id: supplierId },
      });
      if (!supplier) throw new NotFoundException('Fournisseur non trouvé');

      const purchases = await this.prisma.purchase.findMany({
        where: {
          supplierId,
          status: { notIn: EXCLUDED },
        },
        include: { items: { include: { product: true } } },
        orderBy: { createdAt: 'asc' },
      });

      const now = new Date();
      const unpaid: UnpaidPurchaseRow[] = [];
      let totalDue = 0;

      for (const p of purchases) {
        const paid = Number(p.amountPaid);
        const total = Number(p.totalAmount);
        const due = total - paid;
        if (due <= 0) continue;

        totalDue += due;
        const refDate = p.dueDate ? new Date(p.dueDate) : p.invoiceDate
          ? new Date(p.invoiceDate)
          : new Date(p.createdAt);
        const daysOverdue = Math.floor(
          (now.getTime() - refDate.getTime()) / (24 * 60 * 60 * 1000),
        );

        unpaid.push({
          id: p.id,
          reference: p.reference,
          documentType: p.documentType,
          supplierDeliveryNoteNumber: p.supplierDeliveryNoteNumber,
          invoiceNumber: p.invoiceNumber,
          total,
          amountPaid: paid,
          due,
          dueDate: p.dueDate,
          invoiceDate: p.invoiceDate,
          createdAt: p.createdAt,
          daysOverdue: daysOverdue > 0 ? daysOverdue : null,
          status: p.status,
        });
      }

      return {
        supplier: {
          id: supplier.id,
          name: supplier.name,
          email: supplier.email,
          phone: supplier.phone,
          address: supplier.address,
          city: supplier.city,
        },
        totalDue: Math.round(totalDue * 100) / 100,
        unpaidPurchases: unpaid,
      };
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      if (msg.includes('amountPaid') || msg.includes('documentType') || msg.includes('column')) {
        throw new BadRequestException(
          'Schéma achat incomplet. Exécutez: npx prisma migrate deploy',
        );
      }
      throw err;
    }
  }

  async getOverdueCount(days: number): Promise<{ count: number; thresholdDays: number }> {
    try {
      const purchases = await this.prisma.purchase.findMany({
        where: { status: { notIn: EXCLUDED } },
        select: { totalAmount: true, amountPaid: true, dueDate: true, invoiceDate: true, createdAt: true },
      });
      const now = new Date();
      let count = 0;
      for (const p of purchases) {
        const due = Number(p.totalAmount) - Number(p.amountPaid);
        if (due <= 0) continue;
        const refDate = p.dueDate
          ? new Date(p.dueDate)
          : p.invoiceDate
            ? new Date(p.invoiceDate)
            : new Date(p.createdAt);
        const daysOverdue = Math.floor(
          (now.getTime() - refDate.getTime()) / (24 * 60 * 60 * 1000),
        );
        if (daysOverdue >= days) count += 1;
      }
      return { count, thresholdDays: days };
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      if (msg.includes('amountPaid') || msg.includes('column')) {
        throw new BadRequestException(
          'Colonnes achat absentes. Exécutez: npx prisma migrate deploy',
        );
      }
      throw err;
    }
  }
}
