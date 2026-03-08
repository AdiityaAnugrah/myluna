'use client';

import { useState } from 'react';
import { useStockMovements } from '@/lib/hooks/useStock';
import { useProducts } from '@/lib/hooks/useProducts';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { ArrowUp, ArrowDown, Package, Plus, Layers } from 'lucide-react';
import { format } from 'date-fns';
import Link from 'next/link';
import { formatStatus } from '@/lib/utils/format';

export default function StockPage() {
  const [typeFilter, setTypeFilter] = useState<string>('');
  const { data, isLoading } = useStockMovements({ type: typeFilter || undefined });
  const { data: productsData } = useProducts({ limit: 10000 });

  const movements = data?.data?.movements || [];
  // Helper: returns sum of variant stocks if product has variants, otherwise product.stock
  const getEffectiveStock = (product: any): number => {
    let vars = product.variants;
    if (typeof vars === 'string') {
      try { vars = JSON.parse(vars); } catch { vars = []; }
    }
    if (vars && Array.isArray(vars) && vars.length > 0) {
      return vars.reduce((s: number, v: any) => {
        return s + (typeof v === 'object' && v.stock !== undefined ? Number(v.stock) : 0);
      }, 0);
    }
    return Number(product.stock) || 0;
  };

  const totalStock = productsData?.data?.products?.reduce(
    (sum: number, product: any) => sum + getEffectiveStock(product), 0
  ) || 0;

  const getMovementIcon = (movement: any) => {
    if (movement.type === 'ADJUSTMENT') {
      return movement.quantity > 0 ? (
        <ArrowUp className="h-4 w-4 text-primary" />
      ) : (
        <ArrowDown className="h-4 w-4 text-primary" />
      );
    }
    switch (movement.type) {
      case 'IN':
        return <ArrowUp className="h-4 w-4 text-success" />;
      case 'OUT':
        return <ArrowDown className="h-4 w-4 text-destructive" />;
      default:
        return <Package className="h-4 w-4 text-muted-foreground" />;
    }
  };

  const getMovementBadge = (movement: any) => {
    if (movement.type === 'ADJUSTMENT') {
      return <Badge className="bg-primary text-primary-foreground">Penyesuaian {movement.quantity > 0 ? '(+)' : '(-)'}</Badge>;
    }
    switch (movement.type) {
      case 'IN':
        return <Badge variant="success">Stok Masuk</Badge>;
      case 'OUT':
        return <Badge variant="destructive">Stok Keluar</Badge>;
      default:
        return <Badge>{formatStatus(movement.type)}</Badge>;
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between animate-in">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-gradient">Pergerakan Stok</h1>
          <p className="text-muted-foreground mt-1">Lacak semua pergerakan stok dan transaksi gudang</p>
        </div>
        <Link href="/stock/all">
          <Button>
            <Package className="mr-2 h-4 w-4" />
            Stok Keseluruhan
          </Button>
        </Link>
      </div>

      <div className="flex items-center gap-4">
        <div className="w-64">
          <Select value={typeFilter} onValueChange={(v) => setTypeFilter(v === 'all' ? '' : v)}>
            <SelectTrigger>
              <SelectValue placeholder="Filter berdasarkan tipe" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Semua Tipe</SelectItem>
              <SelectItem value="IN">Stok Masuk</SelectItem>
              <SelectItem value="OUT">Stok Keluar</SelectItem>
              <SelectItem value="ADJUSTMENT">Penyesuaian</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="rounded-xl border bg-card shadow-sm overflow-hidden animate-in [animation-delay:100ms] tour-stock-history">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Tanggal</TableHead>
              <TableHead>Produk</TableHead>
              <TableHead>Tipe</TableHead>
              <TableHead className="text-right">Jumlah</TableHead>
              <TableHead>Referensi</TableHead>
              <TableHead>Catatan</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow>
                <TableCell colSpan={6} className="text-center py-12 text-muted-foreground">
                  <div className="flex flex-col items-center gap-2 text-primary">
                    <span className="loading loading-spinner loading-md"></span>
                    <p className="text-sm">Memuat pergerakan...</p>
                  </div>
                </TableCell>
              </TableRow>
            ) : movements.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="text-center py-12 text-muted-foreground">
                  <div className="flex flex-col items-center gap-2 opacity-40">
                    <Package className="h-12 w-12" />
                    <p>Tidak ada pergerakan stok ditemukan</p>
                  </div>
                </TableCell>
              </TableRow>
            ) : (
              movements.map((movement) => (
                <TableRow key={movement.id}>
                  <TableCell className="text-sm">
                    {format(new Date(movement.createdAt), 'dd MMM yyyy HH:mm')}
                  </TableCell>
                  <TableCell className="font-medium">
                    {movement.product?.name || '-'}
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      {getMovementIcon(movement)}
                      {getMovementBadge(movement)}
                    </div>
                  </TableCell>
                  <TableCell className="text-right">
                    <span
                      className={cn(
                        "font-semibold",
                        movement.type === 'IN'
                          ? 'text-success'
                          : movement.type === 'OUT'
                          ? 'text-destructive'
                          : 'text-primary'
                      )}
                    >
                      {movement.type === 'IN' ? '+' : movement.type === 'OUT' ? '-' : ''}
                      {movement.quantity}
                    </span>
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {movement.reference || '-'}
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground max-w-xs truncate">
                    {movement.notes || '-'}
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 tour-stock-status">
        <div className="bg-card p-6 rounded-xl shadow-sm border card-hover animate-in [animation-delay:150ms]">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-blue-500/10 rounded-lg">
              <Layers className="h-6 w-6 text-blue-500" />
            </div>
            <div>
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Total Keseluruhan Stok</p>
              <p className="text-2xl font-bold text-blue-500 mt-1">{totalStock}</p>
            </div>
          </div>
        </div>

        <div className="bg-card p-6 rounded-xl shadow-sm border card-hover animate-in [animation-delay:200ms]">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-success/10 rounded-lg">
              <ArrowUp className="h-6 w-6 text-success" />
            </div>
            <div>
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Stok Masuk</p>
              <p className="text-2xl font-bold text-success mt-1">
                {movements
                  .filter((m) => m.type === 'IN' || (m.type === 'ADJUSTMENT' && m.quantity > 0))
                  .reduce((sum, m) => sum + m.quantity, 0)}
              </p>
            </div>
          </div>
        </div>

        <div className="bg-card p-6 rounded-xl shadow-sm border card-hover animate-in [animation-delay:300ms]">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-destructive/10 rounded-lg">
              <ArrowDown className="h-6 w-6 text-destructive" />
            </div>
            <div>
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Stok Keluar</p>
              <p className="text-2xl font-bold text-destructive mt-1">
                {Math.abs(movements
                  .filter((m) => m.type === 'OUT' || (m.type === 'ADJUSTMENT' && m.quantity < 0))
                  .reduce((sum, m) => sum + m.quantity, 0))}
              </p>
            </div>
          </div>
        </div>

        <div className="bg-card p-6 rounded-xl shadow-sm border card-hover animate-in [animation-delay:400ms]">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-primary/10 rounded-lg">
              <Package className="h-6 w-6 text-primary" />
            </div>
            <div>
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Total Pergerakan</p>
              <p className="text-2xl font-bold text-primary mt-1">{movements.length}</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
