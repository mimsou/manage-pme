import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { OpenCashRegisterDto, CloseCashRegisterDto } from './dto/cash-register.dto';
import { CashRegisterStatus } from '@prisma/client';
import { Decimal } from '@prisma/client/runtime/library';

@Injectable()
export class CashRegisterService {
  constructor(private prisma: PrismaService) {}

  async open(data: OpenCashRegisterDto, userId: string) {
    // Vérifier s'il y a déjà une caisse ouverte pour cet utilisateur
    const existingOpen = await this.prisma.cashRegister.findFirst({
      where: {
        userId,
        status: CashRegisterStatus.OPEN,
      },
    });

    if (existingOpen) {
      throw new BadRequestException('Cash register is already open');
    }

    return this.prisma.cashRegister.create({
      data: {
        userId,
        initialAmount: new Decimal(data.initialAmount),
        status: CashRegisterStatus.OPEN,
      },
      include: {
        user: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
          },
        },
      },
    });
  }

  async close(id: string, data: CloseCashRegisterDto, userId: string) {
    // D'abord récupérer la caisse sans les ventes
    const cashRegister = await this.prisma.cashRegister.findUnique({
      where: { id },
    });

    if (!cashRegister) {
      throw new NotFoundException('Cash register not found');
    }

    if (cashRegister.userId !== userId) {
      throw new BadRequestException('You can only close your own cash register');
    }

    if (cashRegister.status === CashRegisterStatus.CLOSED) {
      throw new BadRequestException('Cash register is already closed');
    }

    // Récupérer les ventes associées à cette caisse depuis sa date d'ouverture
    const sales = await this.prisma.sale.findMany({
      where: {
        cashRegisterId: id,
        createdAt: {
          gte: cashRegister.openDate,
        },
      },
    });

    // Calculer le montant théorique
    const initialAmount = Number(cashRegister.initialAmount);
    const totalSales = sales.reduce((sum, sale) => {
      const cashAmount = sale.cashAmount ? Number(sale.cashAmount) : 0;
      return sum + cashAmount;
    }, 0);
    const expectedAmount = initialAmount + totalSales;

    const actualAmount = new Decimal(data.actualAmount);
    const difference = actualAmount.sub(new Decimal(expectedAmount));

    return this.prisma.cashRegister.update({
      where: { id },
      data: {
        status: CashRegisterStatus.CLOSED,
        closeDate: new Date(),
        expectedAmount: new Decimal(expectedAmount),
        actualAmount: actualAmount,
        difference: difference,
        notes: data.notes,
      },
      include: {
        user: true,
        sales: {
          include: {
            items: {
              include: {
                product: true,
              },
            },
          },
        },
      },
    });
  }

  async getCurrent(userId: string) {
    return this.prisma.cashRegister.findFirst({
      where: {
        userId,
        status: CashRegisterStatus.OPEN,
      },
      include: {
        sales: {
          orderBy: { createdAt: 'desc' },
          include: {
            items: {
              include: {
                product: true,
              },
            },
          },
        },
      },
    });
  }

  async findAll(userId?: string, status?: CashRegisterStatus) {
    const where: any = {};
    if (userId) where.userId = userId;
    if (status) where.status = status;

    return this.prisma.cashRegister.findMany({
      where,
      include: {
        user: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
          },
        },
        _count: {
          select: { sales: true },
        },
      },
      orderBy: { openDate: 'desc' },
    });
  }

  async findOne(id: string) {
    const cashRegister = await this.prisma.cashRegister.findUnique({
      where: { id },
      include: {
        user: true,
        sales: {
          include: {
            items: {
              include: {
                product: true,
              },
            },
            client: true,
          },
        },
      },
    });

    if (!cashRegister) {
      throw new NotFoundException('Cash register not found');
    }

    return cashRegister;
  }
}

