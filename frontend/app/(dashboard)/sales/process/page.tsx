'use client';

import { cn } from '@/lib/utils';


import { useSales, useApproveSale, useRejectSale, useProcessSale } from '@/lib/hooks/useSales';
import { useAuth } from '@/lib/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Breadcrumbs } from '@/components/ui/breadcrumbs';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Check, X, FileText, Loader2, RefreshCw, Printer, AlertCircle } from 'lucide-react';
import { format } from 'date-fns';
import { formatStatus } from '@/lib/utils/format';
import { useState, useRef, useEffect, useMemo, useCallback } from 'react';
import { ConfirmDialog } from '@/components/ConfirmDialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useReactToPrint } from 'react-to-print';
import Barcode from 'react-barcode';
import { toast } from 'sonner';
import { Sale, SaleStatus } from '@/types';
import { formatCurrency, getPdfUrl, getDaysSinceSale, isUrgentSale, getVariants, isHematCargo } from '@/lib/utils/sales';

interface SalesTableProps {
    sales: Sale[];
    isLoading: boolean;
    isHistory?: boolean;
    onApprove?: (id: string) => void;
    onReject?: (id: string) => void;
    onPrint: (sale: Sale) => void;
    getStatusBadge: (status: SaleStatus, isCancelPending?: boolean) => React.ReactNode;
    userRole?: string;
}

const MobileSalesCard = ({ sale, userRole, onApprove, onReject, onPrint, getStatusBadge }: any) => {
    const isUrgent = isUrgentSale(sale);
    const daysSince = getDaysSinceSale(sale.saleDate);

    return (
        <div className={cn(
            "rounded-lg border bg-card p-2.5 shadow-sm mb-2.5 space-y-1.5 relative overflow-hidden",
            isUrgent && "border-l-4 border-l-red-500 bg-red-50/50"
        )}>
            <div className="flex justify-between items-start">
                <div>
                    <div className="font-mono font-bold text-[12px] tracking-tight">{sale.saleNumber}</div>
                    <div className="text-[10px] text-muted-foreground">{format(new Date(sale.saleDate), 'dd MMM yyyy, HH:mm')}</div>
                </div>
                <div className="scale-75 origin-top-right">
                    {getStatusBadge(sale.status, sale.isCancelPending)}
                </div>
            </div>
            
            <div className="space-y-0.5 pt-0.5">
                <div className="flex justify-between text-[11px]">
                    <span className="text-muted-foreground">Pelanggan:</span>
                    <span className="font-medium text-right">{sale.customerName || 'Umum'}</span>
                </div>
                <div className="flex justify-between text-[11px]">
                    <span className="text-muted-foreground">Ekspedisi:</span>
                    {sale.shippingService ? (
                        <span className="font-medium text-right bg-blue-50 text-blue-700 px-1 rounded text-[10px] py-0.5 leading-none">
                            {sale.shippingService.replace(/_/g, ' ')}
                        </span>
                    ) : (
                        <span className="text-muted-foreground text-[10px] italic">Tidak ada</span>
                    )}
                </div>
                 {isHematCargo(sale.shippingService) && sale.shippingDocument && (
                    <div className="flex justify-end mt-0.5">
                        <a 
                            href={getPdfUrl(sale.shippingDocument)} 
                            target="_blank" 
                            rel="noopener noreferrer"
                            className="inline-flex items-center text-[10px] text-blue-600 hover:underline bg-blue-50 px-1.5 py-0.5 rounded leading-none"
                        >
                            <FileText className="h-3 w-3 mr-1" />
                            PDF
                        </a>
                    </div>
                 )}
                 {isUrgent && (
                     <div className="flex justify-end pt-0.5">
                         <Badge variant="destructive" className="h-4 text-[9px] px-1 animate-pulse">
                           <AlertCircle className="mr-1 h-2 w-2" />
                           Mendesak ({daysSince} hari)
                        </Badge>
                     </div>
                 )}
            </div>

            <div className="pt-1.5 border-t flex flex-col gap-0.5">
                <div className="flex items-center justify-between pr-0.5">
                    <span className="text-[10px] text-muted-foreground mr-2">Aktualisasi:</span>
                    <span className="text-[10px] font-mono text-right">{sale.processedAt ? format(new Date(sale.processedAt), 'dd MMM yy, HH:mm') : '-'}</span>
                </div>
                <div className="flex items-center justify-between pt-0.5">
                    {userRole !== 'TCP' && <div className="font-bold text-[12px] text-primary">{formatCurrency(sale.totalAmount)}</div>}
                </div>
            </div>

            {/* Actions */}
            <div className="grid grid-cols-2 gap-1.5 pt-0.5">
                 {/* TCP role: Show Print directly for WAITING_APPROVAL (auto-approve logic) */}
                 {sale.status === 'WAITING_APPROVAL' && userRole === 'TCP' && !sale.isCancelPending && (
                     <Button 
                         variant="outline"
                         size="sm" 
                         className="w-full border-blue-600 text-blue-600 hover:bg-blue-50 h-7 text-[11px]"
                         onClick={() => onPrint(sale)}
                     >
                         <Printer className="h-3 w-3 mr-1.5" />
                         Cetak Resi
                     </Button>
                 )}

                 {/* APPROVED, PROCESSED, SETTLED or COMPLETED */}
                 {['APPROVED', 'PROCESSED', 'SETTLED', 'COMPLETED'].includes(sale.status) && !sale.isCancelPending && (
                     <Button 
                         variant="outline"
                         size="sm" 
                         className="w-full col-span-2 border-blue-600 text-blue-600 hover:bg-blue-50 h-7 text-[11px]"
                         onClick={() => onPrint(sale)}
                     >
                         <Printer className="h-3 w-3 mr-1.5" />
                         {['PROCESSED', 'SETTLED', 'COMPLETED'].includes(sale.status) ? 'Cetak Ulang' : 'Cetak Resi'}
                     </Button>
                 )}
                 
                 {/* Non-TCP roles approval */}
                 {sale.status === 'WAITING_APPROVAL' && userRole !== 'TCP' && !sale.isCancelPending && onApprove && onReject && (
                    <>
                        <Button 
                            variant="destructive" 
                            size="sm"
                            className="w-full h-7 text-[11px]"
                            onClick={() => onReject(sale.id)}
                        >
                            <X className="h-3 w-3 mr-1.5" />
                            Tolak
                        </Button>
                        <Button 
                            variant="default" 
                            size="sm" 
                            className="bg-green-600 hover:bg-green-700 w-full h-7 text-[11px]"
                            onClick={() => onApprove(sale.id)}
                        >
                            <Check className="h-3 w-3 mr-1.5" />
                            ACC
                        </Button>
                    </>
                 )}
            </div>
        </div>
    );
};

// Update SalesTable to render cards on mobile
const SalesTable = ({ 
    sales, 
    isLoading, 
    isHistory = false,
    onApprove, 
    onReject, 
    onPrint,
    getStatusBadge,
    userRole
}: SalesTableProps) => {
    return (
        <>
        {/* Mobile View */}
        <div className="md:hidden block">
            {isLoading ? (
               <div className="py-8 text-center space-y-3">
                  <Loader2 className="h-8 w-8 animate-spin mx-auto text-primary" />
                  <p className="text-sm text-muted-foreground">Memuat data...</p>
               </div>
            ) : sales.length === 0 ? (
               <div className="py-12 text-center border-2 border-dashed rounded-xl bg-muted/30">
                  <p className="text-muted-foreground">{isHistory ? 'Belum ada riwayat.' : 'Tidak ada data.'}</p>
               </div>
            ) : (
                sales.map((sale: Sale) => (
                    <MobileSalesCard 
                        key={sale.id}
                        sale={sale}
                        userRole={userRole}
                        onApprove={onApprove}
                        onReject={onReject}
                        onPrint={onPrint}
                        getStatusBadge={getStatusBadge}
                    />
                ))
            )}
        </div>

        {/* Desktop View */}
        <div className="hidden md:block">
        <Table aria-label="Daftar penjualan">
          <TableHeader>
            <TableRow>
              <TableHead scope="col">No. Penjualan</TableHead>
              <TableHead scope="col">Tanggal</TableHead>
              <TableHead scope="col">Pelanggan</TableHead>
              <TableHead scope="col">Ekspedisi</TableHead>
              <TableHead scope="col">Status</TableHead>
              {userRole !== 'TCP' && <TableHead className="text-right" scope="col">Total</TableHead>}
              <TableHead className="text-center" scope="col">Aktualisasi</TableHead>
              <TableHead className="text-center" scope="col">Aksi</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow>
                <TableCell colSpan={userRole === 'TCP' ? 7 : 8} className="text-center py-12">
                  <Loader2 className="h-8 w-8 animate-spin mx-auto text-primary" />
                  <p className="text-sm text-muted-foreground mt-2">Memuat data...</p>
                  <span className="sr-only" role="status" aria-live="polite">
                    Memuat data penjualan
                  </span>
                </TableCell>
              </TableRow>
            ) : sales.length === 0 ? (
              <TableRow>
                <TableCell colSpan={userRole === 'TCP' ? 7 : 8} className="text-center py-12 text-muted-foreground">
                  {isHistory ? 'Belum ada riwayat penjualan.' : 'Tidak ada data penjualan yang perlu diproses.'}
                </TableCell>
              </TableRow>
            ) : (
              sales.map((sale: Sale, index: number) => {
                const urgent = !isHistory && isUrgentSale(sale);
                const daysSince = getDaysSinceSale(sale.saleDate);
                
                return (
                <TableRow 
                  key={sale.id}
                  className={urgent ? 'bg-red-50 border-l-4 border-l-red-500' : ''}
                >
                  <TableCell className="font-mono text-sm">NO. {index + 1}</TableCell>
                  <TableCell>{format(new Date(sale.saleDate), 'dd MMM yyyy')}</TableCell>
                  <TableCell>
                    <div className="flex flex-col">
                        <span className="font-medium">{sale.customerName || 'Umum'}</span>
                        <span className="text-xs text-muted-foreground">{sale.customerPhone}</span>
                    </div>
                  </TableCell>
                  <TableCell>
                    {sale.shippingService ? (
                        <Badge variant="outline">{sale.shippingService.replace(/_/g, ' ')}</Badge>
                    ) : (
                        <span className="text-muted-foreground text-xs italic">Tidak ada</span>
                    )}
                    {isHematCargo(sale.shippingService) && sale.shippingDocument && (
                         <div className="mt-1">
                            <a 
                                href={getPdfUrl(sale.shippingDocument)} 
                                target="_blank" 
                                rel="noopener noreferrer"
                                className="inline-flex items-center text-xs text-blue-600 hover:underline"
                                aria-label={`Lihat dokumen pengiriman untuk ${sale.saleNumber}`}
                            >
                                <FileText className="h-3 w-3 mr-1" />
                                PDF
                            </a>
                         </div>
                    )}
                  </TableCell>
                  <TableCell>
                      {urgent && (
                        <Badge variant="destructive" className="mr-2 animate-pulse">
                          <AlertCircle className="mr-1 h-3 w-3" />
                          Mendesak - {daysSince} hari
                        </Badge>
                      )}
                      {getStatusBadge(sale.status)}
                  </TableCell>
                  {userRole !== 'TCP' && (
                      <TableCell className="text-right font-semibold">
                        {formatCurrency(sale.totalAmount)}
                      </TableCell>
                  )}
                  <TableCell className="text-center text-xs text-muted-foreground font-mono">
                    {sale.processedAt ? format(new Date(sale.processedAt), 'dd/MM/yy HH:mm') : '-'}
                  </TableCell>
                  <TableCell className="text-center">
                    <div className="flex items-center justify-center gap-2">
                        {/* TCP role: Show Print directly for WAITING_APPROVAL (auto-approve) */}
                        {!isHistory && sale.status === 'WAITING_APPROVAL' && userRole === 'TCP' && !sale.isCancelPending && (
                            <Button 
                                variant="outline"
                                size="sm" 
                                className="h-8 border-blue-600 text-blue-600 hover:bg-blue-50"
                                onClick={() => onPrint(sale)}
                                aria-label={`Cetak resi untuk ${sale.saleNumber}`}
                            >
                                <Printer className="h-4 w-4 mr-1" />
                                Cetak
                            </Button>
                        )}
                        {/* Non-TCP roles: Show ACC/Tolak for WAITING_APPROVAL */}
                        {!isHistory && sale.status === 'WAITING_APPROVAL' && userRole !== 'TCP' && !sale.isCancelPending && onApprove && onReject && (
                            <>
                                <Button 
                                    variant="default" 
                                    size="sm" 
                                    className="bg-green-600 hover:bg-green-700 h-8"
                                    onClick={() => onApprove(sale.id)}
                                    aria-label={`Setujui penjualan ${sale.saleNumber}`}
                                >
                                    <Check className="h-4 w-4 mr-1" />
                                    ACC
                                </Button>
                                <Button 
                                    variant="destructive" 
                                    size="sm"
                                    className="h-8"
                                    onClick={() => onReject(sale.id)}
                                    aria-label={`Tolak penjualan ${sale.saleNumber}`}
                                >
                                    <X className="h-4 w-4 mr-1" />
                                    Tolak
                                </Button>
                            </>
                        )}
                        {/* Show Print for APPROVED sales or History (PROCESSED, SETTLED, COMPLETED) */}
                        {(sale.status === 'APPROVED' || (isHistory && ['PROCESSED', 'SETTLED', 'COMPLETED'].includes(sale.status))) && !sale.isCancelPending && (
                            <Button 
                                variant="outline"
                                size="sm" 
                                className="h-8 border-blue-600 text-blue-600 hover:bg-blue-50"
                                onClick={() => onPrint(sale)}
                                aria-label={`${isHistory ? 'Cetak ulang' : 'Cetak'} resi untuk ${sale.saleNumber}`}
                            >
                                <Printer className="h-4 w-4 mr-1" />
                                {isHistory ? 'Cetak Ulang' : 'Cetak'}
                            </Button>
                        )}
                    </div>
                  </TableCell>
                </TableRow>
              )})  
            )}
          </TableBody>
        </Table>
        </div>
        </>
    );
};

export default function SalesProcessPage() {
  const { user } = useAuth();
  const userRole = user?.role;
  
  const { data, isLoading, isFetching, error, refetch } = useSales({ limit: 100 });
  const approveMutation = useApproveSale();
  const rejectMutation = useRejectSale();
  const processMutation = useProcessSale();

  const [confirmOpen, setConfirmOpen] = useState(false);
  const [actionType, setActionType] = useState<'approve' | 'reject' | null>(null);
  const [selectedSaleId, setSelectedSaleId] = useState<string | null>(null);

  // Print related
  const [printSale, setPrintSale] = useState<Sale | null>(null);
  const printRef = useRef(null);

  const handlePrint = useReactToPrint({
    contentRef: printRef,
    onAfterPrint: () => {
        if (printSale) {
            // Only process if it needs processing (WAITING_APPROVAL or APPROVED)
            if (['WAITING_APPROVAL', 'APPROVED'].includes(printSale.status)) {
              processMutation.mutate(printSale.id, {
                  onSuccess: () => {
                      toast.success('Penjualan berhasil diproses');
                      setPrintSale(null);
                  },
                  onError: (error: any) => {
                      const message = error.response?.data?.message || 'Gagal memproses penjualan';
                      toast.error(message);
                      setPrintSale(null);
                  }
              });
            } else {
              // Just clear printSale if already processed
              setPrintSale(null);
            }
        }
    },
  });

  // Trigger print when printSale is set
  useEffect(() => {
    if (printSale && printRef.current) {
      handlePrint();
    }
  }, [printSale, handlePrint]);

  const sales = data?.data?.sales || [];

  // Memoize sorted/filtered sales lists
  const activeSales = useMemo(() => {
    return sales
      .filter((s: Sale) => ['WAITING_APPROVAL', 'APPROVED'].includes(s.status))
      .sort((a: Sale, b: Sale) => {
        // Sort urgent sales to top
        const aUrgent = isUrgentSale(a);
        const bUrgent = isUrgentSale(b);
        if (aUrgent && !bUrgent) return -1;
        if (!aUrgent && bUrgent) return 1;
        // Then by date (oldest first)
        return new Date(a.saleDate).getTime() - new Date(b.saleDate).getTime();
      });
  }, [sales]);

  const historySales = useMemo(() => {
    return sales.filter((s: Sale) => ['PROCESSED', 'REJECTED', 'SETTLED', 'COMPLETED', 'CANCELLED'].includes(s.status));
  }, [sales]);

  // Memoize event handlers
  const handleAction = useCallback((id: string, type: 'approve' | 'reject') => {
    setSelectedSaleId(id);
    setActionType(type);
    setConfirmOpen(true);
  }, []);

  const confirmAction = useCallback(() => {
    if (selectedSaleId && actionType) {
      if (actionType === 'approve') {
        approveMutation.mutate(selectedSaleId, {
            onSuccess: () => setConfirmOpen(false)
        });
      } else {
        rejectMutation.mutate(selectedSaleId, {
            onSuccess: () => setConfirmOpen(false)
        });
      }
    }
  }, [selectedSaleId, actionType, approveMutation, rejectMutation]);
  
  const handlePrintClick = useCallback((sale: Sale) => {
    if (isHematCargo(sale.shippingService) && sale.shippingDocument) {
        // Open PDF
        window.open(getPdfUrl(sale.shippingDocument), '_blank');
        
        // Only process if it needs processing (WAITING_APPROVAL or APPROVED)
        if (['WAITING_APPROVAL', 'APPROVED'].includes(sale.status)) {
          processMutation.mutate(sale.id, {
              onSuccess: () => {
                  toast.success('Penjualan berhasil diproses');
              },
              onError: (error: any) => {
                  const message = error.response?.data?.message || 'Gagal memproses penjualan';
                  toast.error(message);
              }
          });
        }
    } else {
        // Set sale for printing - useEffect will handle the print and auto-process
        setPrintSale(sale);
    }
  }, [processMutation]);

  const getStatusBadge = useCallback((status: SaleStatus, isCancelPending?: boolean) => {
    if (isCancelPending) {
        return <Badge variant="secondary">Menunggu Persetujuan Pembatalan</Badge>;
    }

    const variants: Record<string, 'default' | 'secondary' | 'destructive' | 'outline'> = {
      WAITING_APPROVAL: 'secondary',
      APPROVED: 'default',
      PROCESSED: 'outline',
      SETTLED: 'outline',
      COMPLETED: 'outline',
      CANCELLED: 'secondary',
      REJECTED: 'destructive',
    };
    
    let translatedStatus = formatStatus(status);
    if (status === 'COMPLETED') translatedStatus = 'Selesai';
    if (status === 'CANCELLED') translatedStatus = 'Dibatalkan';
    if (status === 'SETTLED') translatedStatus = 'Disetorkan';
    if (status === 'PROCESSED') translatedStatus = 'Diproses';
    if (status === 'WAITING_APPROVAL') translatedStatus = 'Menunggu Proses/Packing';
    if (status === 'APPROVED') translatedStatus = 'Disetujui';
    if (status === 'REJECTED') translatedStatus = 'Ditolak';

    return <Badge variant={variants[status] || 'outline'}>{translatedStatus}</Badge>;
  }, []);

  return (
    <div className="space-y-6">
      <Breadcrumbs items={[{ label: 'Penjualan', href: '/sales' }, { label: 'Proses Penjualan' }]} />
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-gradient">Proses Penjualan</h1>
          <p className="text-muted-foreground mt-1">Kelola persetujuan dan pencetakan resi (TCP).</p>
        </div>
        <Button 
          variant="outline" 
          size="sm" 
          onClick={() => refetch()} 
          disabled={isFetching}
          aria-label="Segarkan data penjualan"
        >
          <RefreshCw className={`mr-2 h-4 w-4 ${isFetching ? 'animate-spin' : ''}`} />
          {isFetching ? 'Memuat...' : 'Segarkan'}
        </Button>
      </div>

      {error && (
        <div className="rounded-xl border border-destructive bg-destructive/10 p-6">
          <div className="flex items-center gap-2 text-destructive mb-2">
            <AlertCircle className="h-5 w-5" />
            <h3 className="font-semibold">Gagal Memuat Data</h3>
          </div>
          <p className="text-sm mb-4">
            {(error as any)?.message || 'Terjadi kesalahan saat memuat data penjualan'}
          </p>
          <Button onClick={() => refetch()} variant="outline" size="sm">
            <RefreshCw className="mr-2 h-4 w-4" />
            Coba Lagi
          </Button>
        </div>
      )}

      <Tabs defaultValue="active" className="w-full">
        <TabsList className={cn("grid w-full mb-4", userRole === 'USER' ? "grid-cols-1" : "grid-cols-2")}>
          <TabsTrigger value="active">Perlu Diproses</TabsTrigger>
          {(userRole === 'ADMIN' || userRole === 'SUPER_ADMIN' || userRole === 'TCP') && (
            <TabsTrigger value="history">Riwayat</TabsTrigger>
          )}
        </TabsList>
        
        <TabsContent value="active">
            <div className="rounded-xl border bg-card shadow-sm overflow-hidden">
                <SalesTable 
                    sales={activeSales} 
                    isLoading={isLoading} 
                    onApprove={(id) => handleAction(id, 'approve')}
                    onReject={(id) => handleAction(id, 'reject')}
                    onPrint={handlePrintClick}
                    getStatusBadge={getStatusBadge}
                    userRole={userRole}
                />
            </div>
        </TabsContent>

        <TabsContent value="history">
            <div className="rounded-xl border bg-card shadow-sm overflow-hidden">
                 <SalesTable 
                    sales={historySales} 
                    isLoading={isLoading} 
                    isHistory
                    onPrint={handlePrintClick}
                    getStatusBadge={getStatusBadge}
                    userRole={userRole}
                />
            </div>
        </TabsContent>
      </Tabs>

      <ConfirmDialog
        open={confirmOpen}
        onOpenChange={setConfirmOpen}
        onConfirm={confirmAction}
        title={actionType === 'approve' ? "Setujui Penjualan" : "Tolak Penjualan"}
        description={actionType === 'approve' 
            ? "Apakah Anda yakin ingin menyetujui penjualan ini? Stok akan dikurangi secara permanen." 
            : "Apakah Anda yakin ingin menolak penjualan ini? Stok akan dikembalikan."}
        confirmText={actionType === 'approve' ? "Setujui" : "Tolak"}
        variant={actionType === 'approve' ? "default" : "destructive"}
      />

        {/* ===== AREA CETAK (TERSEMBUNYI DI LAYAR, MUNCUL SAAT PRINT) ===== */}
        <div className="absolute top-0 left-0 w-0 h-0 overflow-hidden opacity-0 pointer-events-none">
            <div ref={printRef} style={{ fontFamily: '"Arial", sans-serif', color: '#111', background: '#fff', padding: '0' }}>
                {printSale && (() => {
                    // Receipt content — rendered twice for 2-up printing
                    const renderReceipt = () => (
                    <>
                    <div style={{ padding: '10px 12px', border: '1px solid #111', pageBreakInside: 'avoid' }}>

                        {/* ── HEADER TOKO ── */}
                        <div style={{ textAlign: 'center', borderBottom: '1.5px double #111', paddingBottom: '8px', marginBottom: '10px' }}>
                            <div style={{ fontSize: '12px', fontWeight: '700', letterSpacing: '1.5px', textTransform: 'uppercase' }}>
                                ✦ LUNAREA FURNITURE ✦
                            </div>
                            <div style={{ fontSize: '7px', marginTop: '3px', letterSpacing: '0.3px', textTransform: 'uppercase', color: '#333' }}>
                                DESA KEDUNGPANE, JL. RAYA BOJA, KEC. MIJEN, KOTA SEMARANG, JAWA TENGAH
                            </div>
                            <div style={{ fontSize: '7px', marginTop: '2px', letterSpacing: '0.3px', textTransform: 'uppercase', color: '#333' }}>
                                TELP: +62 811-2938-160
                            </div>
                        </div>

                        {/* ── LABEL RESI ── */}
                        <div style={{ textAlign: 'center', marginBottom: '6px' }}>
                            <span style={{ fontSize: '12px', fontWeight: '800', letterSpacing: '3px', textTransform: 'uppercase', border: '1.5px solid #111', padding: '3px 15px', display: 'inline-block' }}>
                                RESI PENGIRIMAN
                            </span>
                        </div>

                        {/* ── BARCODE ── */}
                        {/* ── BARCODE ── */}
                        <div style={{ textAlign: 'center', marginBottom: '4px', fontSize: '7px', color: '#555', textTransform: 'uppercase' }}>
                            TANGGAL PESANAN: {format(new Date(printSale.createdAt || new Date()), "dd MMM yyyy, HH:mm 'WIB'")}
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '8px' }}>
                            <Barcode value={printSale.saleNumber} format="CODE128" width={1.5} height={45} fontSize={12} font="monospace" margin={0} />
                        </div>

                        {/* ── INFO EKSPEDISI & PEMBAYARAN ── */}
                        {/* ── INFO EKSPEDISI & PEMBAYARAN ── */}
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '10px', borderBottom: '1px solid #ccc', paddingBottom: '6px', alignItems: 'flex-end' }}>
                            <div>
                                <div style={{ color: '#777', letterSpacing: '0.3px', fontSize: '7px', textTransform: 'uppercase' }}>METODE PEMBAYARAN</div>
                                <div style={{ fontWeight: '800', fontSize: '11px', textTransform: 'uppercase', color: '#111' }}>
                                    {printSale.paymentMethod === 'CREDIT' ? 'TEMPO (CREDIT)' : printSale.paymentMethod}
                                </div>
                            </div>
                            <div style={{ textAlign: 'right' }}>
                                <div style={{ color: '#777', letterSpacing: '0.3px', fontSize: '7px', textTransform: 'uppercase' }}>JASA PENGIRIMAN</div>
                                <div style={{ fontWeight: '800', fontSize: '11px', textTransform: 'uppercase', color: '#111' }}>
                                    {printSale.shippingService?.replace(/_/g, ' ') || '-'}
                                </div>
                            </div>
                        </div>

                        {/* ── PENGIRIM & PENERIMA ── */}
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0', marginBottom: '10px', border: '1px solid #111' }}>
                            {/* PENGIRIM */}
                            <div style={{ padding: '6px 8px', borderRight: '1px solid #111' }}>
                                <div style={{ fontSize: '7px', fontWeight: '600', letterSpacing: '0.5px', textTransform: 'uppercase', color: '#555', marginBottom: '3px', borderBottom: '1px solid #eee', paddingBottom: '2px' }}>
                                    ▶ PENGIRIM
                                </div>
                                <div style={{ fontWeight: '700', fontSize: '9px', textTransform: 'uppercase', marginBottom: '2px' }}>
                                    LUNAREA FURNITURE
                                </div>
                                <div style={{ fontSize: '8px', marginBottom: '2px', textTransform: 'uppercase', color: '#333' }}>TELP: +62 811-2938-160</div>
                                <div style={{ fontSize: '7px', lineHeight: '1.4', color: '#444', textTransform: 'uppercase' }}>
                                    DESA KEDUNGPANE, JL. RAYA BOJA<br/>KEC. MIJEN, SEMARANG, JATENG
                                </div>
                            </div>
                            {/* PENERIMA */}
                            <div style={{ padding: '6px 8px' }}>
                                <div style={{ fontSize: '7px', fontWeight: '600', letterSpacing: '0.5px', textTransform: 'uppercase', color: '#555', marginBottom: '3px', borderBottom: '1px solid #eee', paddingBottom: '2px' }}>
                                    ▶ PENERIMA
                                </div>
                                <div style={{ fontWeight: '700', fontSize: '9px', textTransform: 'uppercase', marginBottom: '2px' }}>
                                    {(printSale.customerName || 'PELANGGAN UMUM')}
                                </div>
                                <div style={{ fontSize: '8px', marginBottom: '2px', textTransform: 'uppercase', color: '#333' }}>
                                    TELP: {printSale.customerPhone || '-'}
                                </div>
                                <div style={{ fontSize: '7px', lineHeight: '1.4', color: '#444', textTransform: 'uppercase', whiteSpace: 'pre-wrap' }}>
                                    {(printSale.shippingAddress || 'ALAMAT TIDAK TERSEDIA')}
                                </div>
                            </div>
                        </div>

                        {/* ── DAFTAR BARANG ── */}
                        <div style={{ border: '1px solid #111', marginBottom: '10px' }}>
                            <div style={{ background: '#111', color: '#fff', padding: '3px 8px', fontSize: '8px', fontWeight: '600', letterSpacing: '1.5px', textTransform: 'uppercase' }}>
                                DAFTAR BARANG
                            </div>
                            <div style={{ padding: '0' }}>
                                {/* Header kolom */}
                                <div style={{ display: 'grid', gridTemplateColumns: '20px 1fr auto auto', gap: '0', borderBottom: '1px solid #ddd', padding: '3px 8px', fontSize: '7px', fontWeight: '600', letterSpacing: '0.5px', textTransform: 'uppercase', color: '#666' }}>
                                    <span style={{ textAlign: 'center' }}>CEK</span>
                                    <span>NAMA BARANG / VARIAN</span>
                                    <span style={{ textAlign: 'center', minWidth: '75px' }}>DIMENSI & BERAT</span>
                                    <span style={{ textAlign: 'right', marginRight: '2px', minWidth: '36px' }}>JML</span>
                                </div>
                                {printSale.items?.map((item: any, idx: number) => {
                                    let productVariants: any[] = [];
                                    try {
                                        const raw = item.product?.variants;
                                        if (Array.isArray(raw)) productVariants = raw;
                                        else if (typeof raw === 'string') productVariants = JSON.parse(raw);
                                    } catch {}
                                    const hasProductVariants = productVariants.length > 0;
                                    const isLast = idx === (printSale.items?.length ?? 0) - 1;
                                    const p = item.product;
                                    const hasDimension = p?.length || p?.width || p?.height;
                                    const hasWeight = p?.weight;
                                    return (
                                        <div key={idx} style={{ display: 'grid', gridTemplateColumns: '20px 1fr auto auto', gap: '4px', padding: '5px 8px', borderBottom: isLast ? 'none' : '1px dashed #eee', alignItems: 'center' }}>
                                            <div style={{ display: 'flex', justifyContent: 'center' }}>
                                                <div style={{ width: '12px', height: '12px', border: '1px solid #666', borderRadius: '2px' }}></div>
                                            </div>
                                            <div>
                                                <div style={{ fontWeight: '700', fontSize: '9px', textTransform: 'uppercase', letterSpacing: '0.3px' }}>
                                                    {(item.product?.name || 'PRODUK')}
                                                </div>
                                                {item.variantName ? (
                                                    <div style={{ fontSize: '8px', color: '#555', marginTop: '1px', textTransform: 'uppercase' }}>
                                                        VARIAN: <span style={{ fontWeight: '600' }}>{item.variantName}</span>
                                                    </div>
                                                ) : hasProductVariants ? (
                                                    <div style={{ fontSize: '7px', color: '#cc0000', marginTop: '1px', fontWeight: '600', textTransform: 'uppercase' }}>
                                                        &#9888; VARIAN TIDAK DIPILIH
                                                    </div>
                                                ) : null}
                                            </div>
                                            <div style={{ minWidth: '75px', textAlign: 'center', fontSize: '7px', color: '#333', lineHeight: '1.5' }}>
                                                {hasDimension && (
                                                    <div style={{ fontWeight: '600' }}>
                                                        {Number(p.length) || '-'}×{Number(p.width) || '-'}×{Number(p.height) || '-'} <span style={{ fontWeight: '400' }}>cm</span>
                                                    </div>
                                                )}
                                                {hasWeight && (
                                                    <div style={{ fontWeight: '600' }}>
                                                        {Number(p.weight)} <span style={{ fontWeight: '400' }}>kg</span>
                                                    </div>
                                                )}
                                                {!hasDimension && !hasWeight && (
                                                    <span style={{ color: '#bbb', fontStyle: 'italic' }}>-</span>
                                                )}
                                            </div>
                                            <div style={{ fontWeight: '700', fontSize: '10px', textAlign: 'right', minWidth: '36px', textTransform: 'uppercase' }}>
                                                ×{item.quantity}
                                            </div>
                                        </div>
                                    );
                                })}
                                {/* Summary Footer Daftar Barang */}
                                <div style={{ display: 'flex', justifyContent: 'space-between', padding: '4px 8px', background: '#f5f5f5', borderTop: '1px solid #111', fontSize: '8px', fontWeight: '700', textTransform: 'uppercase' }}>
                                    <div>
                                        TOTAL BERAT: {
                                            printSale.items?.reduce((ttl: number, it: any) => ttl + (Number(it.product?.weight) || 0) * (it.quantity || 1), 0)
                                        } KG
                                    </div>
                                    <div>
                                        TOTAL QTY: {
                                            printSale.items?.reduce((ttl: number, it: any) => ttl + (it.quantity || 1), 0)
                                        } PCS
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* ── CATATAN ── */}
                        {printSale.notes && (
                            <div style={{ border: '1px dashed #888', padding: '5px 8px', marginBottom: '10px', fontSize: '8px' }}>
                                <div style={{ fontWeight: '600', fontSize: '7px', letterSpacing: '1px', textTransform: 'uppercase', color: '#666', marginBottom: '2px' }}>CATATAN:</div>
                                <div style={{ textTransform: 'uppercase', whiteSpace: 'pre-wrap', color: '#333' }}>{(printSale.notes)}</div>
                            </div>
                        )}

                        {/* ── WARNING FURNITURE ── */}
                        <div style={{ border: '1.5px solid #000', padding: '6px', marginBottom: '10px', textAlign: 'center', background: '#ffebee' }}>
                            <div style={{ fontWeight: '800', fontSize: '11px', letterSpacing: '1px', color: '#c62828', textTransform: 'uppercase' }}>
                                ⚠ AWAS MUDAH LECET ⚠
                            </div>
                            <div style={{ fontSize: '8px', fontWeight: '700', marginTop: '3px', textTransform: 'uppercase', color: '#000' }}>
                                JANGAN DIBANTING / DITUMPUK BARANG BERAT
                            </div>
                        </div>

                        {/* ── FOOTER ── */}
                        <div style={{ borderTop: '1.5px double #111', paddingTop: '6px', textAlign: 'center', fontSize: '7px', color: '#666', letterSpacing: '0.3px', textTransform: 'uppercase' }}>
                            <div>TERIMA KASIH TELAH BERBELANJA DI LUNAREA FURNITURE</div>
                            <div style={{ marginTop: '2px' }}>BARANG YANG SUDAH DIBELI WAJIB DI VIDEO UNBOXING UNTUK KLAIM GARANSI</div>
                        </div>

                    </div>
                    {/* ── CUT HERE LINE ── */}
                    <div style={{ marginTop: '12px', marginBottom: '5px', display: 'flex', alignItems: 'center', color: '#bbb', fontSize: '8px', letterSpacing: '1px' }}>
                        <div style={{ flex: 1, borderBottom: '1.5px dashed #aaa' }}></div>
                        <span style={{ whiteSpace: 'nowrap', background: '#fff', padding: '0 8px' }}>✂ POTONG DISINI ✂</span>
                        <div style={{ flex: 1, borderBottom: '1.5px dashed #aaa' }}></div>
                    </div>
                    </>
                    ); // end renderReceipt

                    return (
                        <>
                            <style type="text/css" media="print">
                                {`
                                  @page { size: A5 portrait; margin: 0; }
                                  body { margin: 0; }
                                `}
                            </style>
                            <div style={{ padding: '8mm', width: '105mm' }}>
                                {renderReceipt()}
                            </div>
                        </>
                    );
                })()}
            </div>
        </div>
    </div>
  );
}
