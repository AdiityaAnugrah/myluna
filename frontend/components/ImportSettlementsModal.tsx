'use client';

import { useState, useRef } from 'react';
import axios from 'axios';
import * as XLSX from 'xlsx';
import { toast } from 'sonner';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useAuth } from '@/lib/hooks/useAuth';
import { useQueryClient } from '@tanstack/react-query';
import { Upload, FileSpreadsheet, CheckCircle, XCircle, AlertCircle } from 'lucide-react';

// ── Settlement types ───────────────────────────────────────────────────────────
interface SettlementRow {
  saleNumber: string;
  settlementDate: string;
  netAmount: number;
  invoiceNumber?: string;
}
interface SettlementResult {
  saleNumber: string;
  status: 'ok' | 'error';
  reason?: string;
}

// ── OtherIncome types ──────────────────────────────────────────────────────────
interface OtherIncomeRow {
  transactionDate: string;
  bankName: string;
  buyerName: string;
  amount: number;
  notes?: string;
}

interface Props {
  isOpen: boolean;
  onClose: () => void;
}

type Tab = 'settlement' | 'other_income';

// ── Shared helpers ─────────────────────────────────────────────────────────────
const parseExcelDate = (val: any): string => {
  if (typeof val === 'number') {
    const d = XLSX.SSF.parse_date_code(val);
    return `${d.y}-${String(d.m).padStart(2, '0')}-${String(d.d).padStart(2, '0')}`;
  }
  const s = String(val).trim();
  if (s.includes('/')) {
    const parts = s.split('/');
    if (parts.length === 3) {
      const [dd, mm, yyyy] = parts;
      return `${yyyy}-${mm.padStart(2, '0')}-${dd.padStart(2, '0')}`;
    }
  }
  return s;
};

const parseAmount = (val: any): number =>
  typeof val === 'number' ? val : parseFloat(String(val).replace(/[^0-9.-]/g, ''));

export function ImportSettlementsModal({ isOpen, onClose }: Props) {
  const { accessToken } = useAuth();
  const queryClient = useQueryClient();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [tab, setTab] = useState<Tab>('settlement');
  const [fileName, setFileName] = useState('');
  const [loading, setLoading] = useState(false);

  // Settlement state
  const [settlementPreview, setSettlementPreview] = useState<SettlementRow[]>([]);
  const [settlementResults, setSettlementResults] = useState<SettlementResult[] | null>(null);

  // OtherIncome state
  const [incomePreview, setIncomePreview] = useState<OtherIncomeRow[]>([]);
  const [incomeImported, setIncomeImported] = useState<number | null>(null);

  const formatCurrency = (v: number) =>
    new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(v);

  const resetFile = () => {
    setFileName('');
    setSettlementPreview([]);
    setSettlementResults(null);
    setIncomePreview([]);
    setIncomeImported(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleTabChange = (t: Tab) => {
    setTab(t);
    resetFile();
  };

  const handleFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setFileName(file.name);
    setSettlementResults(null);
    setIncomeImported(null);

    const reader = new FileReader();
    reader.onload = (evt) => {
      const data = new Uint8Array(evt.target!.result as ArrayBuffer);
      const wb = XLSX.read(data, { type: 'array' });
      const ws = wb.Sheets[wb.SheetNames[0]];
      const raw: any[][] = XLSX.utils.sheet_to_json(ws, { header: 1, defval: '' });

      if (tab === 'settlement') {
        const rows: SettlementRow[] = [];
        for (let i = 1; i < raw.length; i++) {
          const [saleNumber, settlementDate, netAmount, invoiceNumber] = raw[i];
          if (!saleNumber || !settlementDate || !netAmount) continue;
          const amount = parseAmount(netAmount);
          if (isNaN(amount)) continue;
          rows.push({
            saleNumber: String(saleNumber).trim(),
            settlementDate: parseExcelDate(settlementDate),
            netAmount: amount,
            invoiceNumber: invoiceNumber ? String(invoiceNumber).trim() : undefined,
          });
        }
        setSettlementPreview(rows);
      } else {
        const rows: OtherIncomeRow[] = [];
        for (let i = 1; i < raw.length; i++) {
          const [transactionDate, bankName, buyerName, amount, notes] = raw[i];
          if (!transactionDate || !bankName || !buyerName || !amount) continue;
          const amt = parseAmount(amount);
          if (isNaN(amt)) continue;
          rows.push({
            transactionDate: parseExcelDate(transactionDate),
            bankName: String(bankName).trim(),
            buyerName: String(buyerName).trim(),
            amount: amt,
            notes: notes ? String(notes).trim() : undefined,
          });
        }
        setIncomePreview(rows);
      }
    };
    reader.readAsArrayBuffer(file);
  };

  const handleImportSettlements = async () => {
    if (settlementPreview.length === 0) return;
    setLoading(true);
    try {
      const res = await axios.post(
        `${process.env.NEXT_PUBLIC_API_URL}/finance/import-settlements`,
        { rows: settlementPreview },
        { withCredentials: true, headers: { Authorization: `Bearer ${accessToken}` } }
      );
      const { results, successCount, failCount } = res.data.data;
      setSettlementResults(results);
      queryClient.invalidateQueries({ queryKey: ['financialSummary'] });
      failCount === 0
        ? toast.success(`${successCount} settlement berhasil diimport`)
        : toast.warning(`${successCount} berhasil, ${failCount} gagal`);
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Import gagal');
    } finally {
      setLoading(false);
    }
  };

  const handleImportOtherIncomes = async () => {
    if (incomePreview.length === 0) return;
    setLoading(true);
    try {
      const res = await axios.post(
        `${process.env.NEXT_PUBLIC_API_URL}/finance/import-other-incomes`,
        { rows: incomePreview },
        { withCredentials: true, headers: { Authorization: `Bearer ${accessToken}` } }
      );
      const { count } = res.data.data;
      setIncomeImported(count);
      queryClient.invalidateQueries({ queryKey: ['financialSummary'] });
      toast.success(`${count} pendapatan lain-lain berhasil diimport`);
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Import gagal');
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    resetFile();
    setTab('settlement');
    onClose();
  };

  const settlementFailCount = settlementResults?.filter(r => r.status === 'error').length ?? 0;
  const settlementOkCount = settlementResults?.filter(r => r.status === 'ok').length ?? 0;

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="max-w-3xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileSpreadsheet className="h-5 w-5 text-green-600" />
            Import Data dari Excel
          </DialogTitle>
        </DialogHeader>

        {/* Tab switcher */}
        <div className="flex gap-1 p-1 bg-muted rounded-lg">
          <button
            onClick={() => handleTabChange('settlement')}
            className={`flex-1 py-1.5 px-3 text-sm rounded-md font-medium transition-colors ${
              tab === 'settlement' ? 'bg-background shadow text-foreground' : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            Pelunasan (Settlement)
          </button>
          <button
            onClick={() => handleTabChange('other_income')}
            className={`flex-1 py-1.5 px-3 text-sm rounded-md font-medium transition-colors ${
              tab === 'other_income' ? 'bg-background shadow text-foreground' : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            Pendapatan Lain-lain (via Bank)
          </button>
        </div>

        {/* Format hint */}
        <div className="bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-800 rounded-lg p-3 text-xs text-blue-700 dark:text-blue-300">
          {tab === 'settlement' ? (
            <>
              <strong>Kolom Excel (baris pertama = header, dilewati):</strong>
              <div className="mt-1 grid grid-cols-4 gap-1 font-mono">
                {['No Penjualan', 'Tanggal Cair', 'Jumlah Bersih', 'No Invoice'].map(c => (
                  <span key={c} className="bg-blue-100 dark:bg-blue-900 px-2 py-0.5 rounded">{c}</span>
                ))}
              </div>
              <div className="mt-1 grid grid-cols-4 gap-1 font-mono text-muted-foreground">
                <span className="px-2">SA-2026-001</span>
                <span className="px-2">15/02/2026</span>
                <span className="px-2">500000</span>
                <span className="px-2">INV-001 (opsional)</span>
              </div>
            </>
          ) : (
            <>
              <strong>Kolom Excel (baris pertama = header, dilewati):</strong>
              <div className="mt-1 grid grid-cols-5 gap-1 font-mono">
                {['Tanggal', 'Nama Bank', 'Nama Pembeli', 'Jumlah', 'Keterangan'].map(c => (
                  <span key={c} className="bg-blue-100 dark:bg-blue-900 px-2 py-0.5 rounded">{c}</span>
                ))}
              </div>
              <div className="mt-1 grid grid-cols-5 gap-1 font-mono text-muted-foreground">
                <span className="px-2">15/02/2026</span>
                <span className="px-2">BRI</span>
                <span className="px-2">Ahmad</span>
                <span className="px-2">500000</span>
                <span className="px-2">opsional</span>
              </div>
            </>
          )}
        </div>

        {/* File drop zone */}
        <div
          className="border-2 border-dashed border-border rounded-lg p-6 text-center cursor-pointer hover:border-primary/50 transition-colors"
          onClick={() => fileInputRef.current?.click()}
        >
          <Upload className="h-8 w-8 mx-auto mb-2 text-muted-foreground" />
          {fileName
            ? <p className="text-sm font-medium">{fileName}</p>
            : <p className="text-sm text-muted-foreground">Klik untuk pilih file Excel (.xlsx / .xls / .csv)</p>
          }
          <Input ref={fileInputRef} type="file" accept=".xlsx,.xls,.csv" className="hidden" onChange={handleFile} />
        </div>

        {/* Settlement preview */}
        {tab === 'settlement' && settlementPreview.length > 0 && !settlementResults && (
          <div>
            <p className="text-sm font-semibold mb-2">{settlementPreview.length} baris siap diimport:</p>
            <div className="rounded border overflow-hidden max-h-52 overflow-y-auto">
              <table className="w-full text-xs">
                <thead className="bg-muted sticky top-0">
                  <tr>
                    <th className="text-left px-3 py-2">No Penjualan</th>
                    <th className="text-left px-3 py-2">Tgl Cair</th>
                    <th className="text-right px-3 py-2">Jumlah Bersih</th>
                    <th className="text-left px-3 py-2">No Invoice</th>
                  </tr>
                </thead>
                <tbody>
                  {settlementPreview.map((row, i) => (
                    <tr key={i} className={i % 2 === 0 ? 'bg-background' : 'bg-muted/30'}>
                      <td className="px-3 py-1.5 font-mono">{row.saleNumber}</td>
                      <td className="px-3 py-1.5">{row.settlementDate}</td>
                      <td className="px-3 py-1.5 text-right font-medium text-green-600">{formatCurrency(row.netAmount)}</td>
                      <td className="px-3 py-1.5 text-muted-foreground">{row.invoiceNumber || '-'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Settlement results */}
        {tab === 'settlement' && settlementResults && (
          <div>
            <div className="flex gap-4 mb-3">
              <span className="flex items-center gap-1.5 text-sm text-green-600 font-semibold">
                <CheckCircle className="h-4 w-4" /> {settlementOkCount} berhasil
              </span>
              {settlementFailCount > 0 && (
                <span className="flex items-center gap-1.5 text-sm text-red-600 font-semibold">
                  <XCircle className="h-4 w-4" /> {settlementFailCount} gagal
                </span>
              )}
            </div>
            {settlementFailCount > 0 && (
              <div className="rounded border overflow-hidden max-h-52 overflow-y-auto">
                <table className="w-full text-xs">
                  <thead className="bg-muted sticky top-0">
                    <tr>
                      <th className="text-left px-3 py-2">No Penjualan</th>
                      <th className="text-left px-3 py-2">Alasan Gagal</th>
                    </tr>
                  </thead>
                  <tbody>
                    {settlementResults.filter(r => r.status === 'error').map((r, i) => (
                      <tr key={i} className="bg-red-50 dark:bg-red-950/20">
                        <td className="px-3 py-1.5 font-mono">{r.saleNumber}</td>
                        <td className="px-3 py-1.5 text-red-600 flex items-center gap-1">
                          <AlertCircle className="h-3 w-3 shrink-0" /> {r.reason}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* OtherIncome preview */}
        {tab === 'other_income' && incomePreview.length > 0 && incomeImported === null && (
          <div>
            <p className="text-sm font-semibold mb-2">{incomePreview.length} baris siap diimport:</p>
            <div className="rounded border overflow-hidden max-h-52 overflow-y-auto">
              <table className="w-full text-xs">
                <thead className="bg-muted sticky top-0">
                  <tr>
                    <th className="text-left px-3 py-2">Tanggal</th>
                    <th className="text-left px-3 py-2">Bank</th>
                    <th className="text-left px-3 py-2">Nama Pembeli</th>
                    <th className="text-right px-3 py-2">Jumlah</th>
                  </tr>
                </thead>
                <tbody>
                  {incomePreview.map((row, i) => (
                    <tr key={i} className={i % 2 === 0 ? 'bg-background' : 'bg-muted/30'}>
                      <td className="px-3 py-1.5">{row.transactionDate}</td>
                      <td className="px-3 py-1.5 font-medium">{row.bankName}</td>
                      <td className="px-3 py-1.5">{row.buyerName}</td>
                      <td className="px-3 py-1.5 text-right font-medium text-blue-600">{formatCurrency(row.amount)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* OtherIncome success */}
        {tab === 'other_income' && incomeImported !== null && (
          <div className="flex items-center gap-2 text-green-600 font-semibold text-sm">
            <CheckCircle className="h-5 w-5" />
            {incomeImported} pendapatan lain-lain berhasil diimport
          </div>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={handleClose}>Tutup</Button>
          {tab === 'settlement' && settlementPreview.length > 0 && !settlementResults && (
            <Button onClick={handleImportSettlements} disabled={loading} className="bg-green-600 hover:bg-green-700 text-white">
              {loading ? 'Mengimport...' : `Import ${settlementPreview.length} Settlement`}
            </Button>
          )}
          {tab === 'other_income' && incomePreview.length > 0 && incomeImported === null && (
            <Button onClick={handleImportOtherIncomes} disabled={loading} className="bg-blue-600 hover:bg-blue-700 text-white">
              {loading ? 'Mengimport...' : `Import ${incomePreview.length} Pendapatan`}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
