'use client';

import { useState } from 'react';
import { useAuditLogs } from '@/lib/hooks/useAudit';
import { useUsers } from '@/lib/hooks/useUsers';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { format, formatDistanceToNow } from 'date-fns';
import { id as idLocale } from 'date-fns/locale';
import {
  Loader2, RefreshCw, ChevronDown, ChevronRight,
  User, Clock, Monitor, Globe, Tag, ArrowRight,
} from 'lucide-react';
import { cn } from '@/lib/utils';

// ─── Constants ───────────────────────────────────────────────────────────────

const ENTITY_MAP: Record<string, string> = {
  'Product': 'Produk',
  'Sale': 'Penjualan',
  'Purchase': 'Pembelian',
  'User': 'Pengguna',
  'Supplier': 'Supplier',
  'Category': 'Kategori',
  'Auth': 'Sistem',
  'StockMovement': 'Pergerakan Stok',
  'Settlement': 'Pelunasan',
  'Expense': 'Pengeluaran',
  'OtherIncome': 'Pendapatan Lain',
  'Platform': 'Platform',
  'ShippingService': 'Jasa Pengiriman',
  'ChangeRequest': 'Permintaan Persetujuan',
  'ProductVariant': 'Varian Produk',
  'Role': 'Peran',
};

const ACTION_LABEL: Record<string, string> = {
  'CREATE': 'Tambah',
  'UPDATE': 'Ubah',
  'DELETE': 'Hapus',
  'LOGIN': 'Masuk',
  'LOGOUT': 'Keluar',
  'RESUME': 'Kembali Aktif',
};

const ACTION_COLOR: Record<string, string> = {
  'CREATE': 'success',
  'UPDATE': 'info',
  'DELETE': 'destructive',
  'LOGIN': 'success',
  'LOGOUT': 'secondary',
  'RESUME': 'info',
};

const FIELD_LABEL: Record<string, string> = {
  name: 'Nama',
  sellingPrice: 'Harga Jual',
  purchasePrice: 'Harga Beli',
  stock: 'Stok',
  minStock: 'Min Stok',
  unit: 'Satuan',
  isActive: 'Status Aktif',
  status: 'Status',
  totalAmount: 'Total',
  notes: 'Catatan',
  categoryId: 'Kategori',
  email: 'Email',
  role: 'Peran',
  fullName: 'Nama Lengkap',
  quantity: 'Jumlah',
  shippingService: 'Jasa Kirim',
  shippingCost: 'Ongkir',
  isActive_raw: 'Status',
  // Expense & OtherIncome fields
  category: 'Kategori',
  description: 'Deskripsi',
  amount: 'Jumlah',
  expenseDate: 'Tanggal',
  incomeDate: 'Tanggal',
  source: 'Sumber',
  // Settlement fields
  invoiceNumber: 'No. Invoice',
  paymentMethod: 'Metode Bayar',
  settlementDate: 'Tanggal Bayar',
  remainingAmount: 'Sisa Tagihan',
  paidAmount: 'Jumlah Bayar',
  // Auth & System fields
  action: 'Tindakan',
  roleName: 'Nama Peran',
  username: 'Username',
  // ShippingService fields
  isActive_shipping: 'Status Aktif',
};

// ─── Helpers ─────────────────────────────────────────────────────────────────

function parseJson(val: any): any {
  if (val === null || val === undefined) return val;
  if (typeof val === 'string') {
    try { return JSON.parse(val); } catch { return val; }
  }
  return val;
}

function formatValue(val: any, key?: string): string {
  if (val === null || val === undefined) return '—';
  if (typeof val === 'boolean') return val ? 'Aktif' : 'Nonaktif';
  
  // Format as Currency if key indicates money
  const moneyKeys = ['price', 'amount', 'cost', 'total', 'Price', 'Amount', 'Cost', 'Total'];
  if (key && typeof val === 'number' && moneyKeys.some(mk => key.includes(mk))) {
    return new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(val);
  }

  if (typeof val === 'number') return val.toLocaleString('id-ID');
  if (typeof val === 'object') return JSON.stringify(val).substring(0, 60);
  return String(val).substring(0, 80);
}

function getDiff(before: any, after: any): Array<{ key: string; label: string; from: string; to: string }> {
  before = parseJson(before);
  after = parseJson(after);
  if (!before || !after || typeof before !== 'object' || typeof after !== 'object') return [];

  const SKIP = ['updatedAt', 'createdAt', 'deletedAt', 'password', 'id'];
  const result: Array<{ key: string; label: string; from: string; to: string }> = [];

  for (const key of Object.keys(after)) {
    if (SKIP.includes(key)) continue;
    if (JSON.stringify(before[key]) === JSON.stringify(after[key])) continue;
    result.push({
      key,
      label: FIELD_LABEL[key] || key.replace(/([A-Z])/g, ' $1').replace(/^./, s => s.toUpperCase()),
      from: formatValue(before[key], key),
      to: formatValue(after[key], key),
    });
  }
  return result;
}

function getSummary(log: any): string {
  const entity = ENTITY_MAP[log.entity] || log.entity;
  const action = ACTION_LABEL[log.action] || log.action;
  const after = parseJson(log.after);
  const name = after?.name || after?.fullName || '';

  if (log.action === 'LOGIN') return 'Masuk ke dalam sistem';
  if (log.action === 'LOGOUT') return 'Keluar dari sistem';
  if (log.action === 'CREATE') return `Menambahkan ${entity} baru${name ? ` "${name}"` : ''}`;
  if (log.action === 'DELETE') {
    const before = parseJson(log.before);
    const bname = before?.name || before?.fullName || '';
    return `Menghapus ${entity}${bname ? ` "${bname}"` : ''}`;
  }
  if (log.action === 'UPDATE') {
    const diff = getDiff(log.before, log.after);
    if (diff.length === 0) return `Mengubah data ${entity}`;
    return `Mengubah ${diff.length} field pada ${entity}${name ? ` "${name}"` : ''}`;
  }
  if (log.action === 'RESUME') return 'Kembali beraktivitas di sistem';

  return `${action} ${entity}`;
}

function parseUserAgent(ua: string): string {
  if (!ua) return 'Unknown';
  if (/mobile/i.test(ua)) return '📱 Mobile';
  if (/chrome/i.test(ua)) return '🌐 Chrome';
  if (/firefox/i.test(ua)) return '🦊 Firefox';
  if (/safari/i.test(ua)) return '🍎 Safari';
  if (/edge/i.test(ua)) return '🌀 Edge';
  return '🖥️ Desktop';
}

function formatDuration(seconds: number): string {
  if (seconds < 60) return `${seconds} detik`;
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  if (mins < 60) return secs > 0 ? `${mins} mnt ${secs} dtk` : `${mins} menit`;
  const hrs = Math.floor(mins / 60);
  const remMins = mins % 60;
  return remMins > 0 ? `${hrs} jam ${remMins} mnt` : `${hrs} jam`;
}

const AFK_THRESHOLD_MINUTES = 10; // gap > 10 min = AFK

// ─── Detail panel component ───────────────────────────────────────────────────

function LogDetail({ log }: { log: any }) {
  const diff = getDiff(log.before, log.after);
  const after = parseJson(log.after);
  const before = parseJson(log.before);

  return (
    <div className="bg-muted/40 border-t px-4 py-3 space-y-4 text-sm">
      {/* Meta row */}
      <div className="flex flex-wrap gap-4 text-xs text-muted-foreground">
        <span className="flex items-center gap-1">
          <Clock className="h-3 w-3" />
          {format(new Date(log.createdAt), "EEEE, dd MMM yyyy 'pukul' HH:mm:ss", { locale: idLocale })}
        </span>
        <span className="flex items-center gap-1">
          <Globe className="h-3 w-3" />
          IP: {log.ip || '—'}
        </span>
        <span className="flex items-center gap-1">
          <Monitor className="h-3 w-3" />
          {parseUserAgent(log.userAgent || '')}
        </span>
        <span className="flex items-center gap-1">
          <Tag className="h-3 w-3" />
          ID: <span className="font-mono">{log.entityId?.substring(0, 8)}…</span>
        </span>
        {log.duration != null && (
          <span className="flex items-center gap-1 text-amber-600 font-medium">
            ⏱️ Durasi pengisian: <strong>{formatDuration(log.duration)}</strong>
          </span>
        )}
      </div>

      {/* Metadata (extra context like item count, platform) */}
      {log.metadata && typeof log.metadata === 'object' && Object.keys(log.metadata).length > 0 && (
        <div className="flex flex-wrap gap-2">
          {Object.entries(log.metadata as Record<string, any>).map(([k, v]) => (
            <span key={k} className="text-[10px] bg-muted rounded px-1.5 py-0.5">
              {k}: <strong>{String(v)}</strong>
            </span>
          ))}
        </div>
      )}

      {/* CREATE: show new data */}
      {log.action === 'CREATE' && after && (
        <div>
          <p className="text-xs font-semibold text-muted-foreground mb-2">Data yang ditambahkan:</p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
            {Object.entries(after)
              .filter(([k]) => !['id','createdAt','updatedAt','password'].includes(k))
              .map(([k, v]) => (
                <div key={k} className="flex justify-between text-xs bg-success/10 rounded px-2 py-1">
                  <span className="text-muted-foreground">{FIELD_LABEL[k] || k}</span>
                  <span className="font-medium text-success ml-2 truncate max-w-[160px]">{formatValue(v, k)}</span>
                </div>
              ))}
          </div>
        </div>
      )}

      {/* DELETE: show deleted data */}
      {log.action === 'DELETE' && before && (
        <div>
          <p className="text-xs font-semibold text-muted-foreground mb-2">Data yang dihapus:</p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
            {Object.entries(before)
              .filter(([k]) => !['id','createdAt','updatedAt','password'].includes(k))
              .map(([k, v]) => (
                <div key={k} className="flex justify-between text-xs bg-destructive/10 rounded px-2 py-1">
                  <span className="text-muted-foreground">{FIELD_LABEL[k] || k}</span>
                  <span className="font-medium text-destructive ml-2 truncate max-w-[160px]">{formatValue(v, k)}</span>
                </div>
              ))}
          </div>
        </div>
      )}

      {/* UPDATE: show diff */}
      {log.action === 'UPDATE' && (
        <div>
          <p className="text-xs font-semibold text-muted-foreground mb-2">
            {diff.length > 0 ? `${diff.length} perubahan:` : 'Tidak ada perubahan data terdeteksi'}
          </p>
          <div className="space-y-1.5">
            {diff.map((d) => (
              <div key={d.key} className="flex items-center gap-2 text-xs bg-card border rounded px-2 py-1.5">
                <span className="text-muted-foreground w-28 shrink-0">{d.label}</span>
                <span className="text-destructive line-through truncate max-w-[120px]">{d.from}</span>
                <ArrowRight className="h-3 w-3 text-muted-foreground shrink-0" />
                <span className="text-success font-medium truncate max-w-[120px]">{d.to}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function ActivitiesPage() {
  const [page, setPage] = useState(1);
  const [selectedUser, setSelectedUser] = useState<string>('all');
  const [selectedAction, setSelectedAction] = useState<string>('all');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const { data: usersData } = useUsers();
  const users = usersData?.data?.users || [];

  const { data, isLoading, refetch, isRefetching } = useAuditLogs({
    page,
    limit: 25,
    userId: selectedUser === 'all' ? undefined : selectedUser,
    startDate: startDate || undefined,
    endDate: endDate || undefined,
  });

  const allLogs: any[] = data?.data || [];
  const logs = selectedAction === 'all' ? allLogs : allLogs.filter((l: any) => l.action === selectedAction);
  const meta = data?.meta;

  const handleReset = () => {
    setSelectedUser('all');
    setSelectedAction('all');
    setStartDate('');
    setEndDate('');
    setPage(1);
    setExpandedId(null);
  };

  const toggleExpand = (id: string) => {
    setExpandedId(prev => prev === id ? null : id);
  };

  return (
    <div className="space-y-6">
      <div className="animate-in">
        <h1 className="text-3xl font-bold tracking-tight text-gradient">Riwayat Aktivitas</h1>
        <p className="text-muted-foreground mt-1">
          Pantau semua aktivitas pengguna — klik baris untuk melihat detail perubahan.
        </p>
      </div>

      {/* Filters */}
      <Card className="animate-in [animation-delay:100ms] border-none shadow-none bg-transparent">
        <CardHeader className="px-0 pb-3">
          <CardTitle className="text-base">Filter</CardTitle>
        </CardHeader>
        <CardContent className="px-0">
          <div className="flex flex-wrap gap-3">
            <Select value={selectedUser} onValueChange={setSelectedUser}>
              <SelectTrigger className="w-48">
                <User className="h-3.5 w-3.5 mr-2 text-muted-foreground" />
                <SelectValue placeholder="Semua Pengguna" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Semua Pengguna</SelectItem>
                {users.map((u: any) => (
                  <SelectItem key={u.id} value={u.id}>{u.fullName}</SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select value={selectedAction} onValueChange={setSelectedAction}>
              <SelectTrigger className="w-36">
                <SelectValue placeholder="Semua Aksi" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Semua Aksi</SelectItem>
                {Object.entries(ACTION_LABEL).map(([val, label]) => (
                  <SelectItem key={val} value={val}>{label}</SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Input type="date" value={startDate} onChange={e => setStartDate(e.target.value)} className="w-auto" />
            <span className="self-center text-muted-foreground">—</span>
            <Input type="date" value={endDate} onChange={e => setEndDate(e.target.value)} className="w-auto" />

            <Button variant="outline" onClick={handleReset}>
              <RefreshCw className="h-4 w-4 mr-2" /> Reset
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Log List */}
      {isLoading || isRefetching ? (
        <div className="py-16 text-center">
          <Loader2 className="h-8 w-8 animate-spin mx-auto text-primary" />
          <p className="text-sm text-muted-foreground mt-2">Memuat aktivitas...</p>
        </div>
      ) : logs.length === 0 ? (
        <div className="py-16 text-center border-2 border-dashed rounded-xl bg-muted/30">
          <p className="text-muted-foreground">Tidak ada aktivitas ditemukan</p>
        </div>
      ) : (
        <div className="rounded-xl border bg-card shadow-sm overflow-hidden animate-in [animation-delay:200ms]">
          {logs.map((log: any, idx: number) => {
            const isExpanded = expandedId === log.id;
            const summary = getSummary(log);
            const relTime = formatDistanceToNow(new Date(log.createdAt), { locale: idLocale, addSuffix: true });

            return (
              <div key={log.id} className={cn('border-b last:border-b-0', isExpanded && 'bg-muted/20')}>

                {/* AFK gap detection: show if gap from previous log > threshold */}
                {(() => {
                  if (idx === logs.length - 1) return null; // last item, no next item to compare
                  const nextLog = logs[idx + 1];
                  if (!nextLog) return null;
                  const gapMs = new Date(log.createdAt).getTime() - new Date(nextLog.createdAt).getTime();
                  const gapMins = Math.floor(gapMs / 60000);
                  if (gapMins < AFK_THRESHOLD_MINUTES) return null;
                  return (
                    <div className="flex items-center gap-2 px-4 py-1.5 bg-yellow-500/5 border-y border-yellow-500/20">
                      <span className="text-xs text-yellow-600/80">😴 AFK selama {gapMins >= 60 ? `${Math.floor(gapMins/60)} jam ${gapMins%60} menit` : `${gapMins} menit`} — tidak ada aktivitas</span>
                    </div>
                  );
                })()}
                {/* Main row */}
                <div
                  className="flex items-start gap-3 px-4 py-3 cursor-pointer hover:bg-muted/30 transition-colors select-none"
                  onClick={() => toggleExpand(log.id)}
                >
                  {/* Expand icon */}
                  <div className="mt-0.5 text-muted-foreground shrink-0">
                    {isExpanded
                      ? <ChevronDown className="h-4 w-4" />
                      : <ChevronRight className="h-4 w-4" />}
                  </div>

                  {/* Action badge */}
                  <div className="shrink-0 w-16">
                    <Badge variant={ACTION_COLOR[log.action] as any} className="text-[10px] px-1.5 py-0.5">
                      {ACTION_LABEL[log.action] || log.action}
                    </Badge>
                  </div>

                  {/* Entity badge */}
                  <div className="shrink-0 w-24">
                    <span className="text-xs text-muted-foreground font-medium">
                      {ENTITY_MAP[log.entity] || log.entity}
                    </span>
                  </div>

                  {/* Summary */}
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{summary}</p>
                    <p className="text-xs text-muted-foreground flex items-center gap-1 mt-0.5">
                      <User className="h-3 w-3" />
                      {log.user?.fullName || 'Unknown'}
                      {log.user?.email && <span className="opacity-60">· {log.user.email}</span>}
                    </p>
                  </div>

                  {/* Duration badge if tracked */}
                  {log.duration != null && (
                    <span className="shrink-0 text-[10px] bg-amber-500/10 text-amber-700 rounded px-1.5 py-0.5 font-mono hidden sm:inline">
                      ⏱ {formatDuration(log.duration)}
                    </span>
                  )}

                  {/* Time */}
                  <div className="shrink-0 text-right hidden sm:block">
                    <p className="text-xs text-muted-foreground">{relTime}</p>
                    <p className="text-[10px] text-muted-foreground/60 font-mono">
                      {format(new Date(log.createdAt), 'HH:mm:ss')}
                    </p>
                  </div>
                </div>

                {/* Expandable detail panel */}
                {isExpanded && <LogDetail log={log} />}
              </div>
            );
          })}
        </div>
      )}

      {/* Pagination */}
      {meta && meta.totalPages > 1 && (
        <div className="flex items-center justify-end gap-2">
          <Button variant="outline" size="sm" onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1 || isLoading}>
            Sebelumnya
          </Button>
          <span className="text-sm text-muted-foreground">Halaman {page} dari {meta.totalPages}</span>
          <Button variant="outline" size="sm" onClick={() => setPage(p => Math.min(meta.totalPages, p + 1))} disabled={page === meta.totalPages || isLoading}>
            Selanjutnya
          </Button>
        </div>
      )}
    </div>
  );
}
