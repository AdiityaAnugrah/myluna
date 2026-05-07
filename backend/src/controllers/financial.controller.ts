import { Request, Response, NextFunction } from 'express';
import { Settlement, Sale, SaleItem, Product, User } from '../models';
import { PaymentMethod, SalePlatform } from '../models/Sale';
import OtherIncome from '../models/OtherIncome';
import { successResponse } from '../utils/response';
import { Op } from 'sequelize';
import { sequelize } from '../config/database';
import bcrypt from 'bcrypt';

export const financialController = {
  async getSummary(req: Request, res: Response, next: NextFunction) {
    try {
      const { startDate, endDate } = req.query;

      const whereClause: any = {};
      let start: Date | null = null;
      let end: Date | null = null;

      if (startDate && endDate) {
        const [sy, sm, sd] = (startDate as string).split('-').map(Number);
        const [ey, em, ed] = (endDate as string).split('-').map(Number);

        start = new Date(sy, sm - 1, sd, 0, 0, 0, 0);
        end = new Date(ey, em - 1, ed, 23, 59, 59, 999);

        // settlementDate is DATEONLY — compare with date strings, not Date objects
        whereClause.settlementDate = {
          [Op.between]: [startDate as string, endDate as string],
        };
      }

      // ─── DYNAMIC SALDO AWAL (Piutang Lama) ───────────────
      // Calculate remaining initial balance by subtracting ALL system settlements until the report date
      const initialBalanceSale = await Sale.findOne({
        where: { isInitialBalance: true }
      });
      let initialBalanceAtStart = 0;
      let initialBalanceAtEnd = 0;

      if (initialBalanceSale) {
        const initialBalanceOriginal = Number(initialBalanceSale.totalAmount);
        let settledBeforeStart = 0;
        let settledUntilEnd = 0;

        if (start) {
          settledBeforeStart = await Settlement.sum('netAmount', {
            where: { settlementDate: { [Op.lt]: start } }
          }) || 0;
        }

        if (end) {
          settledUntilEnd = await Settlement.sum('netAmount', {
            where: { settlementDate: { [Op.lte]: end } }
          }) || 0;
        } else {
          settledUntilEnd = await Settlement.sum('netAmount') || 0;
        }

        initialBalanceAtStart = Math.max(0, initialBalanceOriginal - settledBeforeStart);
        initialBalanceAtEnd = Math.max(0, initialBalanceOriginal - settledUntilEnd);
      }

      // ─── CARRY-FORWARD: Sisa Piutang dari sebelum periode ini ───────────────
      // SQL SUM for scalability — no row limit
      let carryForwardPiutang = 0;
      if (start) {
        const prevUnsettledSum = await Sale.sum('totalAmount', {
          where: {
            status: { [Op.notIn]: ['SETTLED', 'CANCELLED', 'REJECTED'] },
            saleDate: { [Op.lt]: start },
            isInitialBalance: false,
          },
        }) || 0;
        carryForwardPiutang = prevUnsettledSum + initialBalanceAtStart;
      }

      // ─── Fetch settlements in period (by sale's saleDate) → KREDIT rows ──────
      // Grouped by sale month: settlement for March sale counted in March even if received in April
      const settlementSaleWhere: any = {
        status: { [Op.not]: 'CANCELLED' },
        isInitialBalance: false,
      };
      if (start && end) {
        settlementSaleWhere.saleDate = { [Op.between]: [start, end] };
      }
      const settlements = await Settlement.findAll({
        include: [
          {
            model: Sale,
            as: 'sale',
            where: settlementSaleWhere,
            include: [
              {
                model: SaleItem,
                as: 'items',
                include: [{ model: Product, as: 'product', attributes: ['id', 'name'] }],
              },
            ],
          },
        ],
      });

      // ─── Fetch all non-cancelled sales in period (by saleDate) → DEBIT rows ─
      const salesInPeriodWhere: any = {
        status: { [Op.notIn]: ['CANCELLED', 'REJECTED'] },
        isInitialBalance: false,
      };
      if (start && end) {
        salesInPeriodWhere.saleDate = { [Op.between]: [start, end] };
      }
      const salesInPeriod = await Sale.findAll({
        where: salesInPeriodWhere,
        include: [{
          model: SaleItem,
          as: 'items',
          include: [{ model: Product, as: 'product', attributes: ['id', 'name'] }],
        }],
      });

      // ─── Fetch cancelled sales (display only, no balance effect) ────────────
      const cancelledWhereClause: any = { status: 'CANCELLED' };
      if (start && end) {
        cancelledWhereClause.saleDate = { [Op.between]: [start, end] };
      }
      const cancelledSales = await Sale.findAll({
        where: cancelledWhereClause,
        include: [{
          model: SaleItem,
          as: 'items',
          include: [{ model: Product, as: 'product', attributes: ['id', 'name'] }],
        }],
      });

      // ─── Fetch OtherIncome ─────────────────────────────────────────────────
      const otherIncomeWhere: any = {};
      if (start && end) {
        otherIncomeWhere.transactionDate = { [Op.between]: [start, end] };
      }
      const otherIncomes = await OtherIncome.findAll({ where: otherIncomeWhere });

      // ─── Build unified transaction list ────────────────────────────────────
      const allTransactions: any[] = [];

      // Row 1: Saldo Awal (carry-forward piutang) — opening DEBIT balance
      if (carryForwardPiutang > 0) {
        allTransactions.push({
          date: start!,
          type: 'carry_forward',
          description: 'Saldo Awal – Piutang Terbawa dari Periode Sebelumnya',
          debit: carryForwardPiutang,
          credit: 0,
          netAmount: 0,
          platformFee: 0,
          invoiceNumber: null,
        });
      }

      // All sales in period → DEBIT rows (gross = new receivable created)
      salesInPeriod.forEach((sale: any) => {
        const itemNames = (sale.items || []).map((i: any) => i.product?.name || 'Unknown').join(', ');
        allTransactions.push({
          date: new Date(sale.saleDate),
          type: sale.status === 'SETTLED' ? 'sale_settled' : 'sale_pending',
          description: itemNames,
          debit: parseFloat(sale.totalAmount),
          credit: 0,
          netAmount: 0,
          platformFee: 0,
          invoiceNumber: sale.saleNumber || '-',
        });
      });

      // All settlements → TWO rows each (matching Excel model):
      //   Row 1 (settlement):     Kredit = netAmount received
      //   Row 2 (settlement_fee): Debit  = -(platform fee), negative
      settlements.forEach((settlement: any) => {
        const sale = settlement.sale;
        const items = sale?.items || [];
        const itemNames = items.map((i: any) => i.product?.name || 'Unknown').join(', ');
        const grossAmount = sale ? parseFloat(sale.totalAmount) : parseFloat(settlement.netAmount);
        const netAmount = parseFloat(settlement.netAmount);
        const fee = grossAmount - netAmount;
        allTransactions.push({
          date: new Date(settlement.settlementDate),
          type: 'settlement',
          description: itemNames,
          debit: 0,
          credit: netAmount,
          netAmount,
          platformFee: fee,
          invoiceNumber: settlement.invoiceNumber,
        });
        if (fee > 0) {
          allTransactions.push({
            date: new Date(settlement.settlementDate),
            type: 'settlement_fee',
            description: itemNames,
            debit: -fee,
            credit: 0,
            netAmount: 0,
            platformFee: fee,
            invoiceNumber: settlement.invoiceNumber,
          });
        }
      });

      // Cancelled sales — display only, no balance effect
      cancelledSales.forEach((sale: any) => {
        const itemNames = (sale.items || []).map((i: any) => i.product?.name || 'Unknown').join(', ');
        allTransactions.push({
          date: new Date(sale.saleDate),
          type: 'cancelled',
          description: itemNames,
          debit: 0,
          credit: 0,
          netAmount: 0,
          platformFee: 0,
          invoiceNumber: sale.saleNumber || '-',
        });
      });

      // Other income — DEBIT rows
      otherIncomes.forEach((oi: any) => {
        allTransactions.push({
          date: new Date(oi.transactionDate),
          type: 'other_income',
          description: `${oi.buyerName} via ${oi.bankName}`,
          debit: parseFloat(oi.amount),
          credit: 0,
          netAmount: 0,
          platformFee: 0,
          invoiceNumber: null,
        });
      });

      // Sort: carry_forward first, then by date (oldest first)
      allTransactions.sort((a, b) => {
        if (a.type === 'carry_forward') return -1;
        if (b.type === 'carry_forward') return 1;
        return a.date.getTime() - b.date.getTime();
      });

      // AR running balance: debit increases, credit decreases (debit can be negative for fees)
      let runningBalance = 0;
      const transactions = allTransactions.map((txn, index) => {
        const affectsBalance = txn.type !== 'cancelled';
        if (affectsBalance) {
          runningBalance += txn.debit - txn.credit;
        }
        return {
          no: index + 1,
          date: txn.date,
          type: txn.type,
          description: txn.description,
          debit: txn.debit,
          credit: txn.credit,
          netAmount: txn.netAmount,
          platformFee: txn.platformFee,
          balance: affectsBalance ? runningBalance : null,
          invoiceNumber: txn.invoiceNumber,
        };
      });

      // ─── Summary totals ────────────────────────────────────────────────────
      const totalSelisih = settlements.reduce((sum: number, s: any) => {
        const gross = s.sale ? parseFloat(s.sale.totalAmount) : parseFloat(s.netAmount);
        return sum + (gross - parseFloat(s.netAmount));
      }, 0);

      const totalGrossSettled = settlements.reduce((sum: number, s: any) => {
        const gross = s.sale ? parseFloat(s.sale.totalAmount) : parseFloat(s.netAmount);
        return sum + gross;
      }, 0);

      const totalOtherIncome = otherIncomes.reduce((sum: number, oi: any) =>
        sum + parseFloat(oi.amount), 0);

      const danaBersih = totalGrossSettled - totalSelisih + totalOtherIncome;

      // Piutang (unsettled) in current period
      const piutang = salesInPeriod
        .filter((s: any) => s.status !== 'SETTLED')
        .reduce((sum: number, s: any) => sum + parseFloat(s.totalAmount), 0);

      // Sisa piutang akhir — SQL SUM
      const piutangEndWhere: any = {
        status: { [Op.notIn]: ['SETTLED', 'CANCELLED', 'REJECTED'] },
        isInitialBalance: false,
      };
      if (end) {
        piutangEndWhere.saleDate = { [Op.lte]: end };
      }
      const exactPiutangAtEnd = await Sale.sum('totalAmount', { where: piutangEndWhere }) || 0;
      const sisaPiutangAkhir = exactPiutangAtEnd + initialBalanceAtEnd;

      // Omset = total all non-cancelled sales in period (= Total Debit dari penjualan)
      const omsetKeseluruhan = salesInPeriod.reduce((sum: number, s: any) =>
        sum + parseFloat(s.totalAmount), 0);

      const displayCarryForward = (carryForwardPiutang - initialBalanceAtStart) + initialBalanceAtEnd;

      const totalPelunasanNet = settlements.reduce((sum: number, s: any) =>
        sum + parseFloat(s.netAmount), 0);

      // Net debit = omset (positive) + fees (negative) — matches Excel "Total Debit"
      const netOmset = omsetKeseluruhan - totalSelisih;

      const summary = {
        totalSelisih,
        danaBersih,
        piutang,
        carryForwardPiutang: displayCarryForward,
        saldoAwalPiutang: carryForwardPiutang,
        sisaPiutangAkhir,
        omsetKeseluruhan,
        netOmset,
        totalGrossSettled,
        totalPelunasanNet,
        totalOtherIncome,
        saldoAkhirAR: carryForwardPiutang + omsetKeseluruhan - totalGrossSettled,
        transactionCount: transactions.filter(t =>
          t.type === 'sale_settled' || t.type === 'sale_pending' || t.type === 'settlement' || t.type === 'other_income'
        ).length,
      };

      successResponse(res, { transactions, summary }, 'Financial summary retrieved successfully', 200);
    } catch (error) {
      next(error);
    }
  },

  async setInitialBalance(req: Request, res: Response, next: NextFunction) {
    try {
      const { amount, adminPassword } = req.body;
      const initialAmount = parseFloat(amount);

      if (isNaN(initialAmount) || initialAmount <= 0) {
        return res.status(400).json({
          success: false,
          message: 'Amount must be a valid positive number',
        });
      }

      if (!adminPassword) {
        return res.status(400).json({
          success: false,
          message: 'Password Super Admin wajib diisi untuk keamanan transaksi',
        });
      }

      // Verify admin password
      const user = await User.findByPk(req.user?.id);
      if (!user) {
        return res.status(401).json({ success: false, message: 'User tidak ditemukan' });
      }

      const isPasswordValid = await bcrypt.compare(adminPassword, user.password);
      if (!isPasswordValid) {
        return res.status(400).json({
          success: false,
          message: 'Password Salah! Proses dibatalkan',
        });
      }

      // Check if an initial balance already exists
      const existingInitialBalance = await Sale.findOne({
        where: { isInitialBalance: true }
      });

      if (existingInitialBalance) {
        return res.status(400).json({
          success: false,
          message: 'Saldo awal piutang sudah pernah diatur. Perubahan hanya dapat dilakukan satu kali.',
        });
      }

      // Create a dummy sale to represent the initial balance
      const initialBalanceSale = await Sale.create({
        saleNumber: `SA-PIUTANG-${Date.now()}`,
        saleDate: new Date('2000-01-01'),
        customerName: 'SISTEM (Saldo Awal)',
        totalAmount: initialAmount,
        paymentMethod: PaymentMethod.CASH,
        platform: SalePlatform.OFFLINE_STORE,
        status: 'SETTLED' as any,
        notes: 'Sistem: Set Saldo Awal Piutang Global',
        isInitialBalance: true,
        createdBy: req.user?.id!, // user id from auth middleware
      });

      return successResponse(res, initialBalanceSale, 'Saldo awal piutang berhasil diatur', 201);
    } catch (error) {
      return next(error);
    }
  },

  async getOmsetBreakdown(_req: Request, res: Response, next: NextFunction) {
    try {
      // 1. Monthly Breakdown
      const monthly = await Sale.findAll({
        attributes: [
          [sequelize.fn('YEAR', sequelize.col('saleDate')), 'year'],
          [sequelize.fn('MONTH', sequelize.col('saleDate')), 'month'],
          [sequelize.fn('SUM', sequelize.col('totalAmount')), 'total'],
        ],
        where: {
          status: { [Op.notIn]: ['CANCELLED', 'REJECTED'] },
          isInitialBalance: false,
        },
        group: [
          sequelize.fn('YEAR', sequelize.col('saleDate')),
          sequelize.fn('MONTH', sequelize.col('saleDate')),
        ],
        order: [
          [sequelize.fn('YEAR', sequelize.col('saleDate')), 'DESC'],
          [sequelize.fn('MONTH', sequelize.col('saleDate')), 'DESC'],
        ],
        raw: true,
      });

      // 2. Yearly Breakdown
      const yearly = await Sale.findAll({
        attributes: [
          [sequelize.fn('YEAR', sequelize.col('saleDate')), 'year'],
          [sequelize.fn('SUM', sequelize.col('totalAmount')), 'total'],
        ],
        where: {
          status: { [Op.notIn]: ['CANCELLED', 'REJECTED'] },
          isInitialBalance: false,
        },
        group: [sequelize.fn('YEAR', sequelize.col('saleDate'))],
        order: [[sequelize.fn('YEAR', sequelize.col('saleDate')), 'DESC']],
        raw: true,
      });

      // 3. Grand Total
      const grandTotal = await Sale.sum('totalAmount', {
        where: {
          status: { [Op.notIn]: ['CANCELLED', 'REJECTED'] },
          isInitialBalance: false,
        },
      }) || 0;

      return successResponse(res, { monthly, yearly, grandTotal }, 'Omset breakdown retrieved successfully', 200);
    } catch (error) {
      return next(error);
    }
  },
};

