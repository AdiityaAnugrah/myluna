import { Request, Response, NextFunction } from 'express';
import { Settlement, Sale, SaleItem, Product } from '../models';
import OtherIncome from '../models/OtherIncome';
import { successResponse } from '../utils/response';
import { Op } from 'sequelize';

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

      // ─── CARRY-FORWARD: Sisa Piutang dari sebelum periode ini ───────────────
      // Fetch unsettled sales BEFORE startDate — these are piutang terbawa dari bulan sebelumnya
      let carryForwardPiutang = 0;
      if (start) {
        const prevUnsettled = await Sale.findAll({
          where: {
            status: { [Op.notIn]: ['SETTLED', 'CANCELLED'] },
            saleDate: { [Op.lt]: start },
          },
        });
        carryForwardPiutang = prevUnsettled.reduce(
          (sum: number, s: any) => sum + parseFloat(s.totalAmount),
          0
        );
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

      // Sisa piutang akhir = carry forward + piutang baru - yang sudah dilunaskan (dari settlements bulan ini yg tadinya piutang)
      const sisaPiutangAkhir = carryForwardPiutang + piutang;

      const danaBersih = settlements.reduce((sum: number, s: any) =>
        sum + parseFloat(s.netAmount), 0
      ) + otherIncomes.reduce((sum: number, oi: any) =>
        sum + parseFloat(oi.amount), 0);

      const totalExpense = transactions
        .filter(t => t.type === 'expense')
        .reduce((sum, t) => sum + t.credit, 0);

      const summary = {
        totalIncome,
        totalSelisih,
        danaBersih,
        piutang,
        carryForwardPiutang,  // sisa piutang terbawa dari bulan lalu
        sisaPiutangAkhir,     // total piutang yg masih beredar di akhir periode
        totalExpense,
        finalBalance: runningBalance,
        transactionCount: transactions.filter(t =>
          t.type === 'income' || t.type === 'other_income' || t.type === 'piutang'
        ).length,
      };

      successResponse(res, { transactions, summary }, 'Financial summary retrieved successfully', 200);
    } catch (error) {
      next(error);
    }
  },
};

