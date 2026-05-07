'use client';

import { useState, useRef } from 'react';
import axios from 'axios';
import * as XLSX from 'xlsx';
import { toast } from 'sonner';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useAuth } from '@/lib/hooks/useAuth';
import { useQueryClient } from '@tanstack/react-query';
import { Upload, FileSpreadsheet, CheckCircle, XCircle, AlertCircle } from 'lucide-react';

interface ImportRow {
  saleNumber: string;
  settlementDate: string;
  netAmount: number;
  invoiceNumber?: string;
}

interface ResultRow {
  saleNumber: string;
  status: 'ok' | 'error';
  reason?: string;
}

interface Props {
  isOpen: boolean;
  onClose: () => void;
}

export function ImportSettlementsModal({ isOpen, onClose }: Props) {
  const { accessToken } = useAuth();
  const queryClient = useQueryClient();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [preview, setPreview] = useState<ImportRow[]>([]);
  const [results, setResults] = useState<ResultRow[] | null>(null);
  const [loading, setLoading] = useState(false);
  const [fileName, setFileName] = useState('');

  const formatCurrency = (v: number) =>
    new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(v);

  const handleFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setFileName(file.name);
    setResults(null);

    const reader = new FileReader();
    reader.onload = (evt) => {
      const data = new Uint8Array(evt.target!.result as ArrayBuffer);
      const wb = XLSX.read(data, { type: 'array' });
      const ws = wb.Sheets[wb.SheetNames[0]];
      const raw: any[][] = XLSX.utils.sheet_to_json(ws, { header: 1, defval: '' });

      // Skip header row (row 0), parse from row 1
      const rows: ImportRow[] = [];
      for (let i = 1; i < raw.length; i++) {
        const [saleNumber, settlementDate, netAmount, invoiceNumber] = raw[i];
        if (!saleNumber || !settlementDate || !netAmount) continue;

        // Handle Excel date serial number
        let dateStr = settlementDate;
        if (typeof settlementDate === 'number') {
          const d = XLSX.SSF.parse_date_code(settlementDate);
          dateStr = `${d.y}-${String(d.m).padStart(2, '0')}-${String(d.d).padStart(2, '0')}`;
        } else {
          // Try parsing DD/MM/YYYY or YYYY-MM-DD
          const s = String(settlementDate).trim();
          if (s.includes('/')) {
            const [dd, mm, yyyy] = s.split('/');
            dateStr = `${yyyy}-${mm.padStart(2, '0')}-${dd.padStart(2, '0')}`;
          } else {
            dateStr = s;
          }
        }

        const amount = typeof netAmount === 'number' ? netAmount : parseFloat(String(netAmount).replace(/[^0-9.-]/g, ''));
        if (isNaN(amount)) continue;

        rows.push({
          saleNumber: String(saleNumber).trim(),
          settlementDate: dateStr,
          netAmount: amount,
          invoiceNumber: invoiceNumber ? String(invoiceNumber).trim() : undefined,
        });
      }
      setPreview(rows);
    };
    reader.readAsArrayBuffer(file);
  };

  const handleImport = async () => {
    if (preview.length === 0) return;
    setLoading(true);
    try {
      const res = await axios.post(
        `${process.env.NEXT_PUBLIC_API_URL}/finance/import-settlements`,
        { rows: preview },
        { withCredentials: true, headers: { Authorization: `Bearer ${accessToken}` } }
      );
      const { results: r, successCount, failCount } = res.data.data;
      setResults(r);
      queryClient.invalidateQueries({ queryKey: ['financialSummary'] });
      if (failCount === 0) {
        toast.success(`${successCount} settlement berhasil diimport`);
      } else {
        toast.warning(`${successCount} berhasil, ${failCount} gagal — cek detail di bawah`);
      }
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Import gagal');
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    setPreview([]);
    setResults(null);
    setFileName('');
    if (fileInputRef.current) fileInputRef.current.value = '';
    onClose();
  };

  const successCount = results?.filter(r => r.status === 'ok').length ?? 0;
  const failCount = results?.filter(r => r.status === 'error').length ?? 0;

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="max-w-3xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileSpreadsheet className="h-5 w-5 text-green-600" />
            Import Settlement dari Excel
          </DialogTitle>
          <DialogDescription>
            Upload file Excel dengan kolom: <strong>No Penjualan | Tanggal Cair | Jumlah Bersih | No Invoice (opsional)</strong>
            <br />
            <span className="text-xs text-muted-foreground">Baris pertama = header (dilewati otomatis). Tanggal format: DD/MM/YYYY atau YYYY-MM-DD.</span>
          </DialogDescription>
        </DialogHeader>

        {/* Template download hint */}
        <div className="bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-800 rounded-lg p-3 text-xs text-blue-700 dark:text-blue-300">
          <strong>Format kolom Excel kamu:</strong>
          <div className="mt-1 grid grid-cols-4 gap-1 font-mono">
            <span className="bg-blue-100 dark:bg-blue-900 px-2 py-0.5 rounded">No Penjualan</span>
            <span className="bg-blue-100 dark:bg-blue-900 px-2 py-0.5 rounded">Tanggal Cair</span>
            <span className="bg-blue-100 dark:bg-blue-900 px-2 py-0.5 rounded">Jumlah Bersih</span>
            <span className="bg-blue-100 dark:bg-blue-900 px-2 py-0.5 rounded">No Invoice</span>
          </div>
          <div className="mt-1 grid grid-cols-4 gap-1 font-mono text-muted-foreground">
            <span className="px-2">SA-2026-001</span>
            <span className="px-2">15/02/2026</span>
            <span className="px-2">500000</span>
            <span className="px-2">INV-001 (opsional)</span>
          </div>
        </div>

        {/* File input */}
        <div
          className="border-2 border-dashed border-border rounded-lg p-6 text-center cursor-pointer hover:border-primary/50 transition-colors"
          onClick={() => fileInputRef.current?.click()}
        >
          <Upload className="h-8 w-8 mx-auto mb-2 text-muted-foreground" />
          {fileName ? (
            <p className="text-sm font-medium">{fileName}</p>
          ) : (
            <p className="text-sm text-muted-foreground">Klik untuk pilih file Excel (.xlsx / .xls / .csv)</p>
          )}
          <Input
            ref={fileInputRef}
            type="file"
            accept=".xlsx,.xls,.csv"
            className="hidden"
            onChange={handleFile}
          />
        </div>

        {/* Preview */}
        {preview.length > 0 && !results && (
          <div>
            <p className="text-sm font-semibold mb-2">{preview.length} baris siap diimport:</p>
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
                  {preview.map((row, i) => (
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

        {/* Results */}
        {results && (
          <div>
            <div className="flex gap-4 mb-3">
              <span className="flex items-center gap-1.5 text-sm text-green-600 font-semibold">
                <CheckCircle className="h-4 w-4" /> {successCount} berhasil
              </span>
              {failCount > 0 && (
                <span className="flex items-center gap-1.5 text-sm text-red-600 font-semibold">
                  <XCircle className="h-4 w-4" /> {failCount} gagal
                </span>
              )}
            </div>
            {failCount > 0 && (
              <div className="rounded border overflow-hidden max-h-52 overflow-y-auto">
                <table className="w-full text-xs">
                  <thead className="bg-muted sticky top-0">
                    <tr>
                      <th className="text-left px-3 py-2">No Penjualan</th>
                      <th className="text-left px-3 py-2">Status</th>
                      <th className="text-left px-3 py-2">Keterangan</th>
                    </tr>
                  </thead>
                  <tbody>
                    {results.filter(r => r.status === 'error').map((r, i) => (
                      <tr key={i} className="bg-red-50 dark:bg-red-950/20">
                        <td className="px-3 py-1.5 font-mono">{r.saleNumber}</td>
                        <td className="px-3 py-1.5">
                          <span className="flex items-center gap-1 text-red-600">
                            <AlertCircle className="h-3 w-3" /> Gagal
                          </span>
                        </td>
                        <td className="px-3 py-1.5 text-red-600">{r.reason}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={handleClose}>Tutup</Button>
          {preview.length > 0 && !results && (
            <Button onClick={handleImport} disabled={loading} className="bg-green-600 hover:bg-green-700 text-white">
              {loading ? 'Mengimport...' : `Import ${preview.length} Settlement`}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
