import { Request, Response, NextFunction } from 'express';
import { Settlement, Sale, SaleItem, Product, User } from '../models';
import { PaymentMethod, SalePlatform } from '../models/Sale';
import OtherIncome from '../models/OtherIncome';
import { successResponse } from '../utils/response';
import { Op } from 'sequelize';
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

        whereClause.settlementDate = {
          [Op.between]: [start, end],
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
      // Fetch unsettled sales BEFORE startDate — these are piutang terbawa dari bulan sebelumnya
      let carryForwardPiutang = 0;
      if (start) {
        const prevUnsettled = await Sale.findAll({
          where: {
            status: { [Op.notIn]: ['SETTLED', 'CANCELLED'] },
            saleDate: { [Op.lt]: start },
            isInitialBalance: false // Excluded from raw query, added mathematically below
          },
        });
        carryForwardPiutang = prevUnsettled.reduce(
          (sum: number, s: any) => sum + parseFloat(s.totalAmount),
          0
        );
        carryForwardPiutang += initialBalanceAtStart;
      }

      // Fetch INCOME: Settlements (money in from sales)
      const settlements = await Settlement.findAll({
        where: whereClause,
        include: [
          {
            model: Sale,
            as: 'sale',
            where: { status: { [Op.not]: 'CANCELLED' } },
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

      // Combine into unified transaction list
      const allTransactions: any[] = [];

      // ─── Baris pertama: Saldo Awal (carry-forward piutang) ──────────────────
      if (carryForwardPiutang > 0) {
        allTransactions.push({
          date: start!,
          type: 'carry_forward',
          status: 'settled', // affects running balance
          description: 'Saldo Awal – Sisa Piutang Terbawa dari Periode Sebelumnya',
          debit: carryForwardPiutang,
          credit: 0,
          invoiceNumber: null,
        });
      }

      // Add settlements as INCOME (DEBIT)
      settlements.forEach((settlement: any) => {
        const sale = settlement.sale;
        const items = sale?.items || [];
        const itemNames = items.map((i: any) => i.product?.name || 'Unknown').join(', ');

        const grossAmount = sale ? parseFloat(sale.totalAmount) : parseFloat(settlement.netAmount);
        const netAmount = parseFloat(settlement.netAmount);
        const selisih = grossAmount - netAmount;

        allTransactions.push({
          date: new Date(settlement.settlementDate),
          type: 'income',
          status: 'settled',
          description: `Penjualan: ${itemNames}`,
          debit: grossAmount,
          credit: 0,
          invoiceNumber: settlement.invoiceNumber,
        });

        if (selisih > 0) {
          allTransactions.push({
            date: new Date(settlement.settlementDate),
            type: 'expense',
            status: 'settled',
            description: `Beban Platform: ${itemNames}`,
            debit: 0,
            credit: selisih,
            invoiceNumber: settlement.invoiceNumber,
          });
        }

        allTransactions.push({
          date: new Date(settlement.settlementDate),
          type: 'tipe_pelunasan',
          status: 'settled', // MUST be 'settled' so credit reduces running balance to 0
          description: `Tipe Pelunasan: ${itemNames}${settlement.bankName ? ` (${settlement.bankName})` : ''}`,
          debit: 0,
          credit: netAmount,
          invoiceNumber: settlement.invoiceNumber,
        });
      });

      // Fetch unsettled sales (piutang) within the period
      const piutangWhereClause: any = {
        status: { [Op.notIn]: ['SETTLED', 'CANCELLED'] },
      };
      if (start && end) {
        piutangWhereClause.saleDate = { [Op.between]: [start, end] };
      }
      const unsettledSales = await Sale.findAll({
        where: piutangWhereClause,
        include: [{
          model: SaleItem,
          as: 'items',
          include: [{ model: Product, as: 'product', attributes: ['id', 'name'] }],
        }],
      });

      unsettledSales.forEach((sale: any) => {
        const itemNames = (sale.items || []).map((i: any) => i.product?.name || 'Unknown').join(', ');
        allTransactions.push({
          date: new Date(sale.saleDate),
          type: 'piutang',
          status: 'pending',
          description: `Menunggu Pelunasan: ${itemNames}`,
          debit: parseFloat(sale.totalAmount),
          credit: 0,
          invoiceNumber: sale.saleNumber || '-',
        });
      });

      // Fetch CANCELLED sales
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

      cancelledSales.forEach((sale: any) => {
        const itemNames = (sale.items || []).map((i: any) => i.product?.name || 'Unknown').join(', ');
        allTransactions.push({
          date: new Date(sale.saleDate),
          type: 'cancelled',
          status: 'cancelled',
          description: `Dibatalkan: ${itemNames}`,
          debit: -parseFloat(sale.totalAmount),
          credit: 0,
          invoiceNumber: sale.saleNumber || '-',
        });
      });

      // Fetch OtherIncome
      const otherIncomeWhere: any = {};
      if (start && end) {
        otherIncomeWhere.transactionDate = { [Op.between]: [start, end] };
      }
      const otherIncomes = await OtherIncome.findAll({ where: otherIncomeWhere });

      otherIncomes.forEach((oi: any) => {
        const amount = parseFloat(oi.amount);
        allTransactions.push({
          date: new Date(oi.transactionDate),
          type: 'other_income',
          status: 'settled',
          description: `Pendapatan Lain-lain: ${oi.buyerName} via ${oi.bankName}`,
          debit: amount,
          credit: 0,
          invoiceNumber: null,
        });
        allTransactions.push({
          date: new Date(oi.transactionDate),
          type: 'tipe_pelunasan',
          status: 'settled', // MUST be 'settled' so credit reduces running balance to 0
          description: `Tipe Pelunasan: ${oi.notes ? oi.notes : oi.bankName}`,
          debit: 0,
          credit: amount,
          invoiceNumber: null,
        });
      });

      // Sort by date (oldest first), carry_forward always first
      allTransactions.sort((a, b) => {
        if (a.type === 'carry_forward') return -1;
        if (b.type === 'carry_forward') return 1;
        return a.date.getTime() - b.date.getTime();
      });

      // Calculate running balance (only settled transactions affect balance)
      // runningBalance starts at 0 — carry_forward row (if any) is the first settled entry
      let runningBalance = 0;
      const transactions = allTransactions.map((txn, index) => {
        if (txn.status === 'settled') {
          runningBalance += txn.debit - txn.credit;
        }
        return {
          no: index + 1,
          date: txn.date,
          type: txn.type,
          status: txn.status,
          description: txn.description,
          debit: txn.debit,
          credit: txn.credit,
          balance: txn.status === 'settled' ? runningBalance : null,
          invoiceNumber: txn.invoiceNumber,
        };
      });

      // Summary totals
      const totalIncome = transactions
        .filter(t => t.type === 'income' || t.type === 'other_income')
        .reduce((sum, t) => sum + t.debit, 0);

      const totalSelisih = settlements.reduce((sum: number, s: any) => {
        const gross = s.sale ? parseFloat(s.sale.totalAmount) : parseFloat(s.netAmount);
        return sum + (gross - parseFloat(s.netAmount));
      }, 0);

      // Piutang periode ini
      const piutang = unsettledSales.reduce((sum: number, sale: any) =>
        sum + parseFloat(sale.totalAmount), 0);

      // Sisa piutang akhir = Exact sum of all unsettled sales up to End Date + remaining initial balance
      const allUnsettledUpToEndWhere: any = {
        status: { [Op.notIn]: ['SETTLED', 'CANCELLED'] },
        isInitialBalance: false
      };
      if (end) {
        allUnsettledUpToEndWhere.saleDate = { [Op.lte]: end };
      }
      const allUnsettledUpToEnd = await Sale.findAll({ where: allUnsettledUpToEndWhere });
      const exactPiutangAtEnd = allUnsettledUpToEnd.reduce(
        (sum: number, s: any) => sum + parseFloat(s.totalAmount), 
        0
      );
      
      const sisaPiutangAkhir = exactPiutangAtEnd + initialBalanceAtEnd;

      // ─── OMSET KESELURUHAN: total semua penjualan dalam periode filter ───
      const omsetWhereClause: any = {
        status: { [Op.notIn]: ['CANCELLED'] },
        isInitialBalance: false,
      };
      if (start && end) {
        omsetWhereClause.saleDate = { [Op.between]: [start, end] };
      }
      const omsetKeseluruhan = await Sale.sum('totalAmount', {
        where: omsetWhereClause,
      }) || 0;

      const danaBersih = settlements.reduce((sum: number, s: any) =>
        sum + parseFloat(s.netAmount), 0
      ) + otherIncomes.reduce((sum: number, oi: any) =>
        sum + parseFloat(oi.amount), 0);

      const totalExpense = transactions
        .filter(t => t.type === 'expense')
        .reduce((sum, t) => sum + t.credit, 0);

      // We explicitly calculate displayCarryForward to show the mathematically reduced initial balance on the UI card
      const displayCarryForward = (carryForwardPiutang - initialBalanceAtStart) + initialBalanceAtEnd;

      const summary = {
        totalIncome,
        totalSelisih,
        danaBersih,
        piutang,
        carryForwardPiutang: displayCarryForward,
        sisaPiutangAkhir,
        totalExpense,
        finalBalance: runningBalance,
        omsetKeseluruhan,
        transactionCount: transactions.filter(t =>
          t.type === 'income' || t.type === 'other_income' || t.type === 'piutang'
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
};

