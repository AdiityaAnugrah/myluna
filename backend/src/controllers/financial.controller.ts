import { Request, Response, NextFunction } from 'express';
import { Settlement, Sale, SaleItem, Product, User } from '../models';
import { PaymentMethod, SalePlatform } from '../models/Sale';
import OtherIncome from '../models/OtherIncome';
import HistoricalSettlement from '../models/HistoricalSettlement';
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
      const initialBalanceSale = await Sale.findOne({ where: { isInitialBalance: true } });
      let initialBalanceAtStart = 0;
      let initialBalanceAtEnd = 0;
      let histInPeriod = 0;

      if (initialBalanceSale) {
        const initialBalanceOriginal = Number(initialBalanceSale.totalAmount);

        // Historical settlements reduce the initial balance (pelunasan piutang historis tanpa sale record)
        const histBeforeStart = start
          ? await HistoricalSettlement.sum('amount', { where: { settlementDate: { [Op.lt]: start } } }) || 0
          : 0;
        const histUntilEnd = end
          ? await HistoricalSettlement.sum('amount', { where: { settlementDate: { [Op.lte]: end } } }) || 0
          : await HistoricalSettlement.sum('amount') || 0;

        histInPeriod = histUntilEnd - histBeforeStart;

        initialBalanceAtStart = Math.max(0, initialBalanceOriginal - histBeforeStart);
        initialBalanceAtEnd = Math.max(0, initialBalanceOriginal - histUntilEnd);
      }

      // ─── Fetch historical settlements in period → group 1 KREDIT rows ────────
      const historicalSettlements = start && end
        ? await HistoricalSettlement.findAll({
            where: { settlementDate: { [Op.between]: [startDate as string, endDate as string] } },
          })
        : await HistoricalSettlement.findAll();

      // ─── CARRY-FORWARD: Sisa Piutang dari sebelum periode ini ───────────────
      // Logika: Total sales sebelum periode - Total settled sebelum periode
      let carryForwardPiutang = 0;
      if (start) {
        // Total sales sebelum periode ini (exclude cancelled/rejected)
        const totalSalesBeforePeriod = await Sale.sum('totalAmount', {
          where: {
            status: { [Op.notIn]: ['CANCELLED', 'REJECTED'] },
            saleDate: { [Op.lt]: start },
            isInitialBalance: false,
          },
        }) || 0;

        // Total yang sudah settled sebelum periode ini (gross amount)
        const settledBeforePeriod = await Settlement.findAll({
          where: {
            settlementDate: { [Op.lt]: start }
          },
          include: [{
            model: Sale,
            as: 'sale',
            where: {
              saleDate: { [Op.lt]: start },
              isInitialBalance: false,
              status: { [Op.not]: 'CANCELLED' }
            }
          }]
        });

        const totalSettledBeforePeriod = settledBeforePeriod.reduce((sum, settlement: any) => {
          const gross = settlement.sale ? parseFloat(settlement.sale.totalAmount) : 0;
          return sum + gross;
        }, 0);

        // Carry forward = Sales - Settled (gross)
        const prevUnsettledSum = totalSalesBeforePeriod - totalSettledBeforePeriod;
        carryForwardPiutang = prevUnsettledSum + initialBalanceAtStart;
      }

      // ─── Fetch settlements → KREDIT rows (two groups) ────────────────────────
      // Group 1: settlements for CURRENT period's sales (by sale.saleDate in period)
      //          → March sale settled in April still counts in March
      // Group 2: settlements RECEIVED in period for PREVIOUS sales (by settlementDate)
      //          → February sale settled in March reduces the carry-forward
      const settlementInclude = (saleWhere: any) => ({
        model: Sale,
        as: 'sale',
        where: saleWhere,
        include: [
          {
            model: SaleItem,
            as: 'items',
            include: [{ model: Product, as: 'product', attributes: ['id', 'name'] }],
          },
        ],
      });

      const currentSaleWhere: any = { status: { [Op.not]: 'CANCELLED' }, isInitialBalance: false };
      if (start && end) currentSaleWhere.saleDate = { [Op.between]: [start, end] };
      const currentPeriodSettlements = await Settlement.findAll({
        include: [settlementInclude(currentSaleWhere)],
      });

      // Previous sales settled within this period (reduces carry-forward)
      let prevPeriodSettlements: any[] = [];
      if (start) {
        const prevSaleWhere: any = {
          status: { [Op.not]: 'CANCELLED' },
          isInitialBalance: false,
          saleDate: { [Op.lt]: start },
        };
        const prevSettleWhere: any = {};
        if (start && end) {
          prevSettleWhere.settlementDate = { [Op.between]: [startDate as string, endDate as string] };
        }
        prevPeriodSettlements = await Settlement.findAll({
          where: prevSettleWhere,
          include: [settlementInclude(prevSaleWhere)],
        });
      }

      const settlements = [...currentPeriodSettlements, ...prevPeriodSettlements];

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
          group: 0,
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
          group: 2,
          type: sale.status === 'SETTLED' ? 'sale_settled' : 'sale_pending',
          description: itemNames,
          debit: parseFloat(sale.totalAmount),
          credit: 0,
          netAmount: 0,
          platformFee: 0,
          invoiceNumber: sale.saleNumber || '-',
        });
      });

      // All settlements → TWO rows each (proper accounting):
      //   Row 1 (settlement):     Kredit = netAmount received (cash in bank)
      //   Row 2 (settlement_fee): Kredit = platform fee (reduces AR, not cash)
      // prevPeriod settlements get group=1 so they sort BEFORE current period sales (group=2)
      const prevPeriodIds = new Set(prevPeriodSettlements.map((s: any) => s.id));

      settlements.forEach((settlement: any) => {
        const sale = settlement.sale;
        const items = sale?.items || [];
        const itemNames = items.map((i: any) => i.product?.name || 'Unknown').join(', ');
        const grossAmount = sale ? parseFloat(sale.totalAmount) : parseFloat(settlement.netAmount);
        const netAmount = parseFloat(settlement.netAmount);
        const fee = grossAmount - netAmount;
        const isPrev = prevPeriodIds.has(settlement.id);
        const saleDateRaw = sale?.saleDate ? new Date(sale.saleDate) : null;
        allTransactions.push({
          date: new Date(settlement.settlementDate),
          group: isPrev ? 1 : 2,
          type: 'settlement',
          description: itemNames,
          saleDate: saleDateRaw,
          debit: 0,
          credit: netAmount,
          netAmount,
          platformFee: fee,
          invoiceNumber: settlement.invoiceNumber,
        });
        if (fee > 0) {
          allTransactions.push({
            date: new Date(settlement.settlementDate),
            group: isPrev ? 1 : 2,
            type: 'settlement_fee',
            description: itemNames,
            saleDate: saleDateRaw,
            debit: 0,
            credit: fee,
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
          group: 2,
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
          group: 2,
          type: 'other_income',
          description: `${oi.buyerName} via ${oi.bankName}`,
          debit: parseFloat(oi.amount),
          credit: 0,
          netAmount: 0,
          platformFee: 0,
          invoiceNumber: null,
        });
      });

      // Historical settlements → group 1 KREDIT rows (reduces carry-forward piutang historis)
      historicalSettlements.forEach((hs: any) => {
        const amount = parseFloat(hs.amount);
        const label = [hs.buyerName, hs.bankName ? `via ${hs.bankName}` : null, hs.notes]
          .filter(Boolean).join(' ');
        allTransactions.push({
          date: new Date(hs.settlementDate),
          group: 1,
          type: 'historical_settlement',
          description: label || 'Pelunasan Piutang Historis',
          saleDate: null,
          debit: 0,
          credit: amount,
          netAmount: amount,
          platformFee: 0,
          invoiceNumber: null,
        });
      });

      // Sort: group 0=carry_forward → group 1=prev period settlements (reduces carry-forward first)
      //        → group 2=current period (sales + settlements + other), by date within each group
      allTransactions.sort((a, b) => {
        const ga = a.group ?? 2;
        const gb = b.group ?? 2;
        if (ga !== gb) return ga - gb;
        return a.date.getTime() - b.date.getTime();
      });

      // AR running balance: debit increases, credit decreases
      // other_income does NOT affect AR balance — it's separate cash, not piutang
      let runningBalance = 0;
      const transactions = allTransactions.map((txn, index) => {
        const affectsBalance = txn.type !== 'cancelled' && txn.type !== 'other_income';
        if (affectsBalance) {
          runningBalance += txn.debit - txn.credit;
        }
        return {
          no: index + 1,
          date: txn.date,
          type: txn.type,
          group: txn.group ?? 2,
          description: txn.description,
          saleDate: txn.saleDate ?? null,
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
        totalPelunasanNet: totalPelunasanNet + histInPeriod,
        totalOtherIncome,
        saldoAkhirAR: carryForwardPiutang + omsetKeseluruhan - totalGrossSettled - histInPeriod,
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

  async createHistoricalSettlement(req: Request, res: Response, next: NextFunction) {
    try {
      const { amount, settlementDate, bankName, buyerName, notes } = req.body;
      const parsedAmount = parseFloat(amount);

      if (isNaN(parsedAmount) || parsedAmount <= 0) {
        return res.status(400).json({ success: false, message: 'Amount harus angka positif' });
      }
      if (!settlementDate) {
        return res.status(400).json({ success: false, message: 'Tanggal cair wajib diisi' });
      }

      // Check initial balance exists
      const initialBalanceSale = await Sale.findOne({ where: { isInitialBalance: true } });
      if (!initialBalanceSale) {
        return res.status(400).json({ success: false, message: 'Saldo awal piutang belum diatur. Set dulu via "Set Saldo Awal".' });
      }

      // Check remaining initial balance
      const totalHistSettled = await HistoricalSettlement.sum('amount') || 0;
      const remaining = Number(initialBalanceSale.totalAmount) - totalHistSettled;
      if (parsedAmount > remaining) {
        return res.status(400).json({
          success: false,
          message: `Jumlah melebihi sisa piutang historis (Rp ${remaining.toLocaleString('id-ID')})`,
        });
      }

      const record = await HistoricalSettlement.create({
        amount: String(parsedAmount),
        settlementDate: new Date(settlementDate),
        bankName: bankName || null,
        buyerName: buyerName || null,
        notes: notes || null,
        createdBy: req.user!.id,
      });

      return successResponse(res, record, 'Pelunasan piutang historis berhasil dicatat', 201);
    } catch (error) {
      return next(error);
    }
  },

  async listHistoricalSettlements(_req: Request, res: Response, next: NextFunction) {
    try {
      const records = await HistoricalSettlement.findAll({ order: [['settlementDate', 'ASC']] });
      return successResponse(res, records, 'OK', 200);
    } catch (error) {
      return next(error);
    }
  },

  async updateHistoricalSettlement(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;
      const { amount, settlementDate, bankName, buyerName, notes } = req.body;
      const record = await HistoricalSettlement.findByPk(id);
      if (!record) return res.status(404).json({ success: false, message: 'Tidak ditemukan' });

      const parsedAmount = amount !== undefined ? parseFloat(amount) : undefined;
      if (parsedAmount !== undefined && (isNaN(parsedAmount) || parsedAmount <= 0)) {
        return res.status(400).json({ success: false, message: 'Amount harus angka positif' });
      }

      await record.update({
        ...(parsedAmount !== undefined && { amount: String(parsedAmount) }),
        ...(settlementDate && { settlementDate: new Date(settlementDate) }),
        ...(bankName !== undefined && { bankName: bankName || null }),
        ...(buyerName !== undefined && { buyerName: buyerName || null }),
        ...(notes !== undefined && { notes: notes || null }),
      });
      return successResponse(res, record, 'Berhasil diperbarui', 200);
    } catch (error) {
      return next(error);
    }
  },

  async deleteHistoricalSettlement(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;
      const record = await HistoricalSettlement.findByPk(id);
      if (!record) return res.status(404).json({ success: false, message: 'Tidak ditemukan' });
      await record.destroy();
      return successResponse(res, null, 'Berhasil dihapus', 200);
    } catch (error) {
      return next(error);
    }
  },

  async importOtherIncomes(req: Request, res: Response, next: NextFunction) {
    try {
      const { rows } = req.body as {
        rows: Array<{
          transactionDate: string;
          bankName: string;
          buyerName: string;
          amount: number;
          notes?: string;
        }>;
      };

      if (!Array.isArray(rows) || rows.length === 0) {
        return res.status(400).json({ success: false, message: 'Data rows kosong' });
      }

      const created = await OtherIncome.bulkCreate(
        rows.map(r => ({
          transactionDate: new Date(r.transactionDate),
          bankName: r.bankName,
          buyerName: r.buyerName,
          amount: String(r.amount),
          notes: r.notes || 'Import dari Excel',
          createdBy: req.user!.id,
        }))
      );

      return successResponse(res, { count: created.length }, `${created.length} pendapatan lain-lain berhasil diimport`, 200);
    } catch (error) {
      return next(error);
    }
  },

  async importSettlements(req: Request, res: Response, next: NextFunction) {
    try {
      const { rows } = req.body as {
        rows: Array<{
          saleNumber: string;
          settlementDate: string;
          netAmount: number;
          invoiceNumber?: string;
        }>;
      };

      if (!Array.isArray(rows) || rows.length === 0) {
        return res.status(400).json({ success: false, message: 'Data rows kosong' });
      }

      const results: { saleNumber: string; status: 'ok' | 'error'; reason?: string }[] = [];

      for (const row of rows) {
        try {
          const sale = await Sale.findOne({
            where: { saleNumber: row.saleNumber, isInitialBalance: false },
          });

          if (!sale) {
            results.push({ saleNumber: row.saleNumber, status: 'error', reason: 'Penjualan tidak ditemukan' });
            continue;
          }

          const existing = await Settlement.findOne({ where: { saleId: sale.id } });
          if (existing) {
            results.push({ saleNumber: row.saleNumber, status: 'error', reason: 'Settlement sudah ada' });
            continue;
          }

          await Settlement.create({
            saleId: sale.id,
            invoiceNumber: row.invoiceNumber || null,
            netAmount: String(row.netAmount),
            settlementDate: new Date(row.settlementDate),
            notes: 'Import dari Excel',
            createdBy: req.user!.id,
          });

          await sale.update({ status: 'SETTLED' as any });
          results.push({ saleNumber: row.saleNumber, status: 'ok' });
        } catch (err: any) {
          results.push({ saleNumber: row.saleNumber, status: 'error', reason: err.message });
        }
      }

      const successCount = results.filter(r => r.status === 'ok').length;
      const failCount = results.filter(r => r.status === 'error').length;
      return successResponse(res, { results, successCount, failCount }, `Import selesai: ${successCount} berhasil, ${failCount} gagal`, 200);
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

