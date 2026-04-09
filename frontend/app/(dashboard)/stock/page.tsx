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
import { Input } from '@/components/ui/input';
import { 
  ArrowUp, 
  ArrowDown, 
  Package, 
  Plus, 
  Layers, 
  ChevronLeft, 
  ChevronRight,
  Filter,
  Calendar,
  Eye,
  Loader2
} from 'lucide-react';
import { format } from 'date-fns';
import Link from 'next/link';
import { formatStatus } from '@/lib/utils/format';
import { StockMovementDetailModal } from '@/components/stock/StockMovementDetailModal';

export default function StockPage() {
  const [typeFilter, setTypeFilter] = useState<string>('');
  
  // Default to current month: 1st day to today
  const [startDate, setStartDate] = useState<string>(() => {
    const d = new Date();
    return new Date(d.getFullYear(), d.getMonth(), 1).toISOString().split('T')[0];
  });
  const [endDate, setEndDate] = useState<string>(() => {
    return new Date().toISOString().split('T')[0];
  });
  
  const [currentPage, setCurrentPage] = useState(1);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
  const [selectedMovement, setSelectedMovement] = useState<any>(null);
  const itemsPerPage = 50;

  const { data, isLoading } = useStockMovements({ 
    type: typeFilter || undefined,
    startDate,
    endDate: endDate ? `${endDate}T23:59:59` : undefined, // Ensure end of day
    page: currentPage,
    limit: itemsPerPage
  });
  
  const { data: productsData } = useProducts({ limit: 10000 });

  const movements = data?.data?.movements || [];
  const pagination = data?.data?.pagination;

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

  const handleShowDetail = (movement: any) => {
    setSelectedMovement(movement);
    setIsDetailModalOpen(true);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 animate-in">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-gradient text-orange-600">Pergerakan Stok</h1>
          <p className="text-muted-foreground mt-1">Lacak semua pergerakan stok dan transaksi gudang</p>
        </div>
        <Link href="/stock/all">
          <Button variant="outline" className="border-orange-500 text-orange-600 hover:bg-orange-50">
            <Package className="mr-2 h-4 w-4" />
            Stok Keseluruhan
          </Button>
        </Link>
      </div>

      {/* Filter Bar */}
      <div className="bg-card border rounded-xl p-4 shadow-sm space-y-4">
        <div className="flex items-center gap-2 text-sm font-semibold text-muted-foreground">
          <Filter className="h-4 w-4" />
          FILTER DATA
        </div>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="space-y-2">
            <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground ml-1">Tipe</label>
            <Select value={typeFilter} onValueChange={(v) => { setTypeFilter(v === 'all' ? '' : v); setCurrentPage(1); }}>
              <SelectTrigger>
                <SelectValue placeholder="Semua Tipe" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Semua Tipe</SelectItem>
                <SelectItem value="IN">Stok Masuk</SelectItem>
                <SelectItem value="OUT">Stok Keluar</SelectItem>
                <SelectItem value="ADJUSTMENT">Penyesuaian</SelectItem>
              </SelectContent>
            </Select>
          </div>
          
          <div className="space-y-2">
            <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground ml-1">Dari Tanggal</label>
            <div className="relative">
              <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input 
                type="date" 
                value={startDate} 
                onChange={(e) => { setStartDate(e.target.value); setCurrentPage(1); }} 
                className="pl-10"
              />
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground ml-1">Sampai Tanggal</label>
            <div className="relative">
              <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input 
                type="date" 
                value={endDate} 
                onChange={(e) => { setEndDate(e.target.value); setCurrentPage(1); }} 
                className="pl-10"
              />
            </div>
          </div>

          <div className="flex items-end pb-0.5">
             <Button 
                variant="ghost" 
                className="text-xs font-bold text-orange-600"
                onClick={() => {
                  const d = new Date();
                  setStartDate(new Date(d.getFullYear(), d.getMonth(), 1).toISOString().split('T')[0]);
                  setEndDate(new Date().toISOString().split('T')[0]);
                  setTypeFilter('');
                  setCurrentPage(1);
                }}
             >
                Reset Filter
             </Button>
          </div>
        </div>
      </div>

      <div className="rounded-xl border bg-card shadow-sm overflow-hidden animate-in [animation-delay:100ms] tour-stock-history">
        <Table>
          <TableHeader className="bg-muted/50">
            <TableRow>
              <TableHead>Tanggal</TableHead>
              <TableHead>Produk</TableHead>
              <TableHead>Tipe</TableHead>
              <TableHead className="text-right">Jumlah</TableHead>
              <TableHead>Referensi</TableHead>
              <TableHead>Catatan</TableHead>
              <TableHead className="text-right">Aksi</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow>
                <TableCell colSpan={6} className="text-center py-12 text-muted-foreground">
                  <div className="flex flex-col items-center gap-2 text-orange-500">
                    <Loader2 className="h-8 w-8 animate-spin" />
                    <p className="text-sm font-medium">Memuat pergerakan...</p>
                  </div>
                </TableCell>
              </TableRow>
            ) : movements.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="text-center py-12 text-muted-foreground">
                  <div className="flex flex-col items-center gap-2 opacity-40">
                    <Package className="h-12 w-12" />
                    <p>Tidak ada pergerakan stok ditemukan di periode ini</p>
                  </div>
                </TableCell>
              </TableRow>
            ) : (
              movements.map((movement) => (
                <TableRow key={movement.id} className="hover:bg-muted/30 transition-colors">
                  <TableCell className="text-xs whitespace-nowrap">
                    {format(new Date(movement.createdAt), 'dd MMM yyyy HH:mm')}
                  </TableCell>
                  <TableCell className="font-semibold text-sm">
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
                        "font-bold",
                        movement.type === 'IN'
                          ? 'text-green-600'
                          : movement.type === 'OUT'
                          ? 'text-red-600'
                          : 'text-orange-600'
                      )}
                    >
                      {movement.type === 'IN' ? '+' : movement.type === 'OUT' ? '-' : ''}
                      {movement.quantity}
                    </span>
                  </TableCell>
                  <TableCell className="text-xs text-muted-foreground">
                    {movement.reference || '-'}
                  </TableCell>
                  <TableCell className="text-xs text-muted-foreground max-w-xs truncate">
                    {movement.notes || '-'}
                  </TableCell>
                  <TableCell className="text-right">
                    <Button 
                      variant="ghost" 
                      size="sm" 
                      onClick={() => handleShowDetail(movement)}
                      className="h-8 w-8 p-0 text-orange-600 hover:text-orange-700 hover:bg-orange-50"
                    >
                      <Eye className="h-4 w-4" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>

        {/* Pagination UI */}
        {pagination && pagination.totalPages > 1 && (
          <div className="flex items-center justify-between p-4 border-t bg-muted/20">
            <p className="text-xs text-muted-foreground font-medium">
              Menampilkan {(currentPage - 1) * itemsPerPage + 1} - {Math.min(currentPage * itemsPerPage, pagination.total)} dari {pagination.total} baris
            </p>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                disabled={currentPage === 1 || isLoading}
                className="h-8 w-8 p-0"
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <div className="flex items-center gap-1">
                {Array.from({ length: Math.min(5, pagination.totalPages) }, (_, i) => {
                   // Simple pagination page numbers logic
                   let pageNum = i + 1;
                   if (pagination.totalPages > 5 && currentPage > 3) {
                      pageNum = currentPage - 3 + i + 1;
                      if (pageNum > pagination.totalPages) pageNum = pagination.totalPages - (4 - i);
                   }
                   if (pageNum <= 0) return null;
                   if (pageNum > pagination.totalPages) return null;

                   return (
                      <Button
                        key={pageNum}
                        variant={currentPage === pageNum ? 'default' : 'outline'}
                        size="sm"
                        onClick={() => setCurrentPage(pageNum)}
                        className={cn("h-8 w-8 p-0 text-xs", currentPage === pageNum ? "bg-orange-600 hover:bg-orange-700" : "")}
                        disabled={isLoading}
                      >
                        {pageNum}
                      </Button>
                   );
                })}
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCurrentPage(p => Math.min(pagination.totalPages, p + 1))}
                disabled={currentPage === pagination.totalPages || isLoading}
                className="h-8 w-8 p-0"
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
        )}
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 tour-stock-status">
        <div className="bg-orange-500/5 p-6 rounded-xl shadow-sm border border-orange-500/20 card-hover animate-in [animation-delay:150ms]">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-orange-500/10 rounded-lg">
              <Layers className="h-6 w-6 text-orange-500" />
            </div>
            <div>
              <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Total Real-time Stok</p>
              <p className="text-2xl font-black text-orange-600 mt-1">{totalStock}</p>
            </div>
          </div>
        </div>

        <div className="bg-green-500/5 p-6 rounded-xl shadow-sm border border-green-500/20 card-hover animate-in [animation-delay:200ms]">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-green-500/10 rounded-lg">
              <ArrowUp className="h-6 w-6 text-green-600" />
            </div>
            <div>
              <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Stok Masuk (Filter)</p>
              <p className="text-2xl font-black text-green-600 mt-1">
                {movements
                  .filter((m: any) => m.type === 'IN' || (m.type === 'ADJUSTMENT' && m.quantity > 0))
                  .reduce((sum: number, m: any) => sum + m.quantity, 0)}
              </p>
            </div>
          </div>
        </div>

        <div className="bg-red-500/5 p-6 rounded-xl shadow-sm border border-red-500/20 card-hover animate-in [animation-delay:300ms]">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-red-500/10 rounded-lg">
              <ArrowDown className="h-6 w-6 text-red-600" />
            </div>
            <div>
              <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Stok Keluar (Filter)</p>
              <p className="text-2xl font-black text-red-600 mt-1">
                {Math.abs(movements
                  .filter((m: any) => m.type === 'OUT' || (m.type === 'ADJUSTMENT' && m.quantity < 0))
                  .reduce((sum: number, m: any) => sum + m.quantity, 0))}
              </p>
            </div>
          </div>
        </div>

        <div className="bg-blue-500/5 p-6 rounded-xl shadow-sm border border-blue-500/20 card-hover animate-in [animation-delay:400ms]">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-blue-500/10 rounded-lg">
              <Package className="h-6 w-6 text-blue-600" />
            </div>
            <div>
              <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Total Transaksi (Filter)</p>
              <p className="text-2xl font-black text-blue-600 mt-1">{pagination?.total || 0}</p>
            </div>
          </div>
        </div>
      </div>

      <StockMovementDetailModal 
        isOpen={isDetailModalOpen} 
        onClose={() => setIsDetailModalOpen(false)} 
        movement={selectedMovement}
      />
    </div>
  );
}

