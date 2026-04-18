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
import { Check, X, FileText, Loader2, RefreshCw, Printer, AlertCircle, Filter, XCircle, Search } from 'lucide-react';
import { format } from 'date-fns';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { formatStatus } from '@/lib/utils/format';
import { useState, useRef, useEffect, useMemo, useCallback } from 'react';
import { ConfirmDialog } from '@/components/ConfirmDialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Pagination } from '@/components/ui/pagination';
import { useReactToPrint } from 'react-to-print';
import Barcode from 'react-barcode';
import { toast } from 'sonner';
import { Sale, SaleStatus } from '@/types';
import { formatCurrency, getPdfUrl, getDaysSinceSale, isUrgentSale, getVariants, isToday } from '@/lib/utils/sales';



interface SalesTableProps {
    sales: Sale[];
    isLoading: boolean;
    isHistory?: boolean;
    onApprove?: (id: string) => void;
    onReject?: (id: string) => void;
    onPrint: (sale: Sale) => void;
    getStatusBadge: (status: SaleStatus, isCancelPending?: boolean) => React.ReactNode;
    userRole?: string;
    currentPage: number;
    itemsPerPage: number;
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
                    <div className="text-[10px] text-muted-foreground">{format(new Date(sale.saleDate), 'dd MMM yyyy')}</div>
                    <div className="text-[10px] text-muted-foreground font-mono">Dikirim: {format(new Date(sale.createdAt), 'HH:mm')} WIB</div>
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
                {sale.items && sale.items.length > 0 && (
                    <div className="pt-0.5 pb-0.5">
                        <div className="text-[10px] text-muted-foreground mb-0.5">Produk:</div>
                        <div className="flex flex-col gap-0.5">
                            {sale.items.map((item: any, i: number) => (
                                <div key={i} className="flex items-center gap-1 text-[11px]">
                                    <span className="text-muted-foreground font-mono">{item.quantity}×</span>
                                    <span className="font-medium truncate max-w-[150px]">{item.product?.name || '-'}</span>
                                    {item.variantName && (
                                        <span className="text-[9px] bg-muted px-1 rounded text-muted-foreground shrink-0">{item.variantName}</span>
                                    )}
                                </div>
                            ))}
                        </div>
                    </div>
                )}
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
                 {sale.shippingDocument && (
                    <div className="flex justify-end mt-0.5">
                        <a 
                            href={getPdfUrl(sale.shippingDocument)} 
                            target="LunaPDFViewer" 
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
                    <span className="text-[10px] font-mono text-right flex items-center gap-1.5">
                        {sale.processedAt ? format(new Date(sale.processedAt), 'dd MMM yy, HH:mm') : '-'}
                        {sale.processedAt && isToday(sale.processedAt) && (
                            <Badge className="bg-green-600 hover:bg-green-600 text-[8px] h-3.5 px-1 leading-none">Hari Ini</Badge>
                        )}
                    </span>
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
    userRole,
    currentPage = 1,
    itemsPerPage = 10
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
              <TableHead scope="col">Produk Dipesan</TableHead>
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
                <TableCell colSpan={userRole === 'TCP' ? 8 : 9} className="text-center py-12">
                  <Loader2 className="h-8 w-8 animate-spin mx-auto text-primary" />
                  <p className="text-sm text-muted-foreground mt-2">Memuat data...</p>
                  <span className="sr-only" role="status" aria-live="polite">
                    Memuat data penjualan
                  </span>
                </TableCell>
              </TableRow>
            ) : sales.length === 0 ? (
              <TableRow>
                <TableCell colSpan={userRole === 'TCP' ? 8 : 9} className="text-center py-12 text-muted-foreground">
                  {isHistory ? 'Belum ada riwayat penjualan.' : 'Tidak ada data penjualan yang perlu diproses.'}
                </TableCell>
              </TableRow>
            ) : (
              sales.map((sale: Sale, index: number) => {
                const urgent = !isHistory && isUrgentSale(sale);
                const daysSince = getDaysSinceSale(sale.saleDate);
                
                const processedToday = isHistory && sale.processedAt && isToday(sale.processedAt);
                
                return (
                <TableRow 
                  key={sale.id}
                  className={cn(
                    urgent ? 'bg-red-50 border-l-4 border-l-red-500' : '',
                    processedToday ? 'bg-green-50/50' : ''
                  )}
                >
                  <TableCell className="font-mono text-sm">NO. {(index + 1) + (currentPage - 1) * itemsPerPage}</TableCell>
                  <TableCell>
                    <div className="flex flex-col gap-0.5">
                      <span>{format(new Date(sale.saleDate), 'dd MMM yyyy')}</span>
                      <span className="text-[10px] text-muted-foreground font-mono">
                        Dikirim: {format(new Date(sale.createdAt), 'HH:mm')} WIB
                      </span>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex flex-col gap-0.5">
                        <div className="flex items-center gap-2">
                           <span className="font-medium">{sale.customerName || 'Umum'}</span>
                           <span className="text-[10px] font-mono bg-muted/60 border px-1.5 py-0.5 rounded text-muted-foreground whitespace-nowrap">{sale.saleNumber}</span>
                        </div>
                        <span className="text-xs text-muted-foreground">{sale.customerPhone}</span>
                        {processedToday && (
                            <div className="mt-1">
                                <Badge variant="default" className="bg-green-600 hover:bg-green-600 text-[10px] h-4 px-1.5 flex w-fit items-center gap-1">
                                    <Check className="w-2.5 h-2.5" />
                                    Dikerjakan Hari Ini
                                </Badge>
                            </div>
                        )}
                    </div>
                  </TableCell>
                  {/* Produk Dipesan */}
                  <TableCell>
                    <div className="flex flex-col gap-1 max-w-[220px]">
                      {sale.items && sale.items.length > 0 ? (
                        sale.items.map((item: any, i: number) => (
                          <div key={i} className="flex items-start gap-1.5">
                            <span className="text-[10px] text-muted-foreground font-mono mt-0.5 shrink-0">{item.quantity}×</span>
                            <div className="flex flex-col min-w-0">
                              <span className="text-xs font-medium leading-tight truncate">{item.product?.name || '-'}</span>
                              {item.variantName && (
                                <span className="text-[10px] text-muted-foreground bg-muted px-1 rounded w-fit mt-0.5 leading-tight">{item.variantName}</span>
                              )}
                            </div>
                          </div>
                        ))
                      ) : (
                        <span className="text-xs text-muted-foreground italic">-</span>
                      )}
                    </div>
                  </TableCell>

                  <TableCell>
                    {sale.shippingService ? (
                        <Badge variant="outline">{sale.shippingService.replace(/_/g, ' ')}</Badge>
                    ) : (
                        <span className="text-muted-foreground text-xs italic">Tidak ada</span>
                    )}
                    {sale.shippingDocument && (
                         <div className="mt-1">
                            <a
                                href={getPdfUrl(sale.shippingDocument)}
                                target="LunaPDFViewer"
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
  
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [paymentMethod, setPaymentMethod] = useState('ALL');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(searchQuery), 500);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  const [activePage, setActivePage] = useState(1);
  const [activeLimit, setActiveLimit] = useState(10);
  
  const [historyPage, setHistoryPage] = useState(1);
  const [historyLimit, setHistoryLimit] = useState(10);

  const { data, isLoading, isFetching, error, refetch } = useSales({ 
    limit: 500,
    ...(startDate && endDate ? { startDate, endDate } : {}),
    ...(paymentMethod !== 'ALL' ? { paymentMethod } : {}),
    ...(statusFilter !== 'ALL' ? { status: statusFilter } : {}),
    ...(debouncedSearch ? { search: debouncedSearch } : {})
  });
  const approveMutation = useApproveSale();
  const rejectMutation = useRejectSale();
  const processMutation = useProcessSale();

  const [confirmOpen, setConfirmOpen] = useState(false);
  const [actionType, setActionType] = useState<'approve' | 'reject' | null>(null);
  const [selectedSaleId, setSelectedSaleId] = useState<string | null>(null);

  // Print related
  const [printSale, setPrintSale] = useState<Sale | null>(null);
  const printRef = useRef(null);
  const isPrintingRef = useRef(false);

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

  // Trigger print when printSale is set - guarded with ref to prevent double trigger
  useEffect(() => {
    if (printSale && printRef.current && !isPrintingRef.current) {
      isPrintingRef.current = true;
      handlePrint();
    }

    if (!printSale) {
      isPrintingRef.current = false;
    }
  }, [printSale, handlePrint]);

  const sales = data?.data?.sales || [];

  // Memoize sorted/filtered sales lists
  const activeSales = useMemo(() => {
    return sales
      .filter((s: Sale) => {
          if (!['WAITING_APPROVAL', 'APPROVED'].includes(s.status)) return false;
          if (searchQuery) {
              const query = searchQuery.toLowerCase();
              return s.saleNumber.toLowerCase().includes(query) ||
                  (s.customerName && s.customerName.toLowerCase().includes(query)) ||
                  (s.customerPhone && s.customerPhone.toLowerCase().includes(query));
          }
          return true;
      })
      .sort((a: Sale, b: Sale) => {
        // Sort urgent sales to top
        const aUrgent = isUrgentSale(a);
        const bUrgent = isUrgentSale(b);
        if (aUrgent && !bUrgent) return -1;
        if (!aUrgent && bUrgent) return 1;
        // Then by date (newest first)
        return new Date(b.saleDate).getTime() - new Date(a.saleDate).getTime();
      });
  }, [sales]);

  const historySales = useMemo(() => {
    return sales
      .filter((s: Sale) => {
          if (!['PROCESSED', 'REJECTED', 'SETTLED', 'COMPLETED', 'CANCELLED'].includes(s.status)) return false;
          if (searchQuery) {
              const query = searchQuery.toLowerCase();
              return s.saleNumber.toLowerCase().includes(query) ||
                  (s.customerName && s.customerName.toLowerCase().includes(query)) ||
                  (s.customerPhone && s.customerPhone.toLowerCase().includes(query));
          }
          return true;
      })
      .sort((a: Sale, b: Sale) => {
        const dateA = a.processedAt ? new Date(a.processedAt).getTime() : new Date(a.createdAt).getTime();
        const dateB = b.processedAt ? new Date(b.processedAt).getTime() : new Date(b.createdAt).getTime();
        return dateB - dateA;
      });
  }, [sales]);

  const processedTodayCount = useMemo(() => {
    return historySales.filter(s => s.processedAt && isToday(s.processedAt)).length;
  }, [historySales]);

  const paginatedActiveSales = useMemo(() => {
    const startIndex = (activePage - 1) * activeLimit;
    return activeSales.slice(startIndex, startIndex + activeLimit);
  }, [activeSales, activePage, activeLimit]);

  const paginatedHistorySales = useMemo(() => {
    const startIndex = (historyPage - 1) * historyLimit;
    return historySales.slice(startIndex, startIndex + historyLimit);
  }, [historySales, historyPage, historyLimit]);

  useEffect(() => {
    setActivePage(1);
    setHistoryPage(1);
  }, [startDate, endDate, paymentMethod, statusFilter, searchQuery, data]);

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
    if (sale.shippingDocument) {
        // Open PDF in a reusable tab to prevent clutter
        window.open(getPdfUrl(sale.shippingDocument), 'LunaPDFViewer');
        
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

      {/* Filter Section */}
      <div className="rounded-xl border bg-card p-4 mb-4 shadow-sm flex flex-col gap-4">
        <div className="w-full">
            <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input 
                    placeholder="Cari berdasarkan No. Penjualan, Nama Pelanggan, atau No. Telepon..." 
                    className="pl-9 h-10 w-full"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                />
            </div>
        </div>
        
        <div className="flex flex-col md:flex-row gap-4 items-end">
          <div className="w-full md:w-auto flex-1 space-y-1.5">
            <label className="text-xs font-medium text-muted-foreground flex items-center gap-1.5"><Filter className="w-3 h-3"/> Mulai Tanggal</label>
            <Input 
              type="date" 
              value={startDate} 
              onChange={(e) => setStartDate(e.target.value)} 
              className="h-9"
            />
          </div>
          <div className="w-full md:w-auto flex-1 space-y-1.5">
            <label className="text-xs font-medium text-muted-foreground">Sampai Tanggal</label>
            <Input 
              type="date" 
              value={endDate} 
              onChange={(e) => setEndDate(e.target.value)}
              className="h-9" 
            />
          </div>
          <div className="w-full md:w-auto flex-1 space-y-1.5">
            <label className="text-xs font-medium text-muted-foreground">Metode Pembayaran</label>
            <Select value={paymentMethod} onValueChange={setPaymentMethod}>
              <SelectTrigger className="h-9">
                <SelectValue placeholder="Semua Metode" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">Semua Metode</SelectItem>
                <SelectItem value="CASH">Tunai (CASH)</SelectItem>
                <SelectItem value="TRANSFER">Transfer</SelectItem>
                <SelectItem value="CREDIT">Tempo (CREDIT)</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="w-full md:w-auto flex-1 space-y-1.5">
            <label className="text-xs font-medium text-muted-foreground">Status Awal</label>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="h-9">
                <SelectValue placeholder="Semua Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">Semua Status</SelectItem>
                <SelectItem value="WAITING_APPROVAL">Belum Dilakukan Aksi</SelectItem>
                <SelectItem value="APPROVED">Disetujui/Dipacking</SelectItem>
                <SelectItem value="PROCESSED">Sudah Diproses/Resi</SelectItem>
                <SelectItem value="COMPLETED">Selesai</SelectItem>
                <SelectItem value="CANCELLED">Dibatalkan</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="w-full md:w-auto flex flex-row gap-2 pt-2 md:pt-0">
             <Button variant="outline" className="h-9 w-full md:w-auto text-muted-foreground" onClick={() => {
                setStartDate('');
                setEndDate('');
                setPaymentMethod('ALL');
                setStatusFilter('ALL');
                setSearchQuery('');
             }}>
               <XCircle className="h-4 w-4 mr-1.5" />
               Reset
             </Button>
          </div>
        </div>
      </div>

      <Tabs defaultValue="active" className="w-full">
        <TabsList className={cn("grid w-full mb-4", userRole === 'USER' ? "grid-cols-1" : "grid-cols-2")}>
          <TabsTrigger value="active">Perlu Diproses</TabsTrigger>
          {(userRole === 'ADMIN' || userRole === 'SUPER_ADMIN' || userRole === 'TCP') && (
            <TabsTrigger value="history">Riwayat</TabsTrigger>
          )}
        </TabsList>
        
        <TabsContent value="active">
            <div className="rounded-xl border bg-card shadow-sm overflow-hidden flex flex-col">
                <SalesTable 
                    sales={paginatedActiveSales} 
                    isLoading={isLoading} 
                    onApprove={(id) => handleAction(id, 'approve')}
                    onReject={(id) => handleAction(id, 'reject')}
                    onPrint={handlePrintClick}
                    getStatusBadge={getStatusBadge}
                    userRole={userRole}
                    currentPage={activePage}
                    itemsPerPage={activeLimit}
                />
                {!isLoading && activeSales.length > 0 && (
                   <div className="border-t">
                     <Pagination
                        currentPage={activePage}
                        totalPages={Math.ceil(activeSales.length / activeLimit)}
                        totalItems={activeSales.length}
                        itemsPerPage={activeLimit}
                        onPageChange={setActivePage}
                        onItemsPerPageChange={(limit) => {
                          setActiveLimit(limit);
                          setActivePage(1);
                        }}
                     />
                   </div>
                )}
            </div>
        </TabsContent>

        <TabsContent value="history">
            <div className="mb-4 flex items-center justify-between bg-green-50 border border-green-200 rounded-xl p-4 shadow-sm">
                <div className="flex items-center gap-3">
                    <div className="bg-green-100 p-2 rounded-lg text-green-700">
                        <Check className="w-5 h-5" />
                    </div>
                    <div>
                        <h3 className="text-sm font-semibold text-green-900">Pengerjaan Hari Ini</h3>
                        <p className="text-xs text-green-700">Total pesanan yang telah diselesaikan hari ini.</p>
                    </div>
                </div>
                <div className="text-2xl font-bold text-green-700">
                    {processedTodayCount} <span className="text-xs font-normal text-green-600 ml-1">Pesanan</span>
                </div>
            </div>
            <div className="rounded-xl border bg-card shadow-sm overflow-hidden flex flex-col">
                 <SalesTable 
                    sales={paginatedHistorySales} 
                    isLoading={isLoading} 
                    isHistory
                    onPrint={handlePrintClick}
                    getStatusBadge={getStatusBadge}
                    userRole={userRole}
                    currentPage={historyPage}
                    itemsPerPage={historyLimit}
                />
                {!isLoading && historySales.length > 0 && (
                   <div className="border-t">
                     <Pagination
                        currentPage={historyPage}
                        totalPages={Math.ceil(historySales.length / historyLimit)}
                        totalItems={historySales.length}
                        itemsPerPage={historyLimit}
                        onPageChange={setHistoryPage}
                        onItemsPerPageChange={(limit) => {
                          setHistoryLimit(limit);
                          setHistoryPage(1);
                        }}
                     />
                   </div>
                )}
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
                    // Receipt content
                    const renderReceipt = () => (
                    <div style={{ padding: '20px 25px', border: '2px solid #000', pageBreakInside: 'avoid', background: '#fff' }}>

                        {/* ── HEADER TOKO ── */}
                        <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '3px double #000', paddingBottom: '15px', marginBottom: '20px', alignItems: 'center' }}>
                            <div style={{ textAlign: 'left' }}>
                                <div style={{ fontSize: '17px', fontWeight: '600', letterSpacing: '2px', textTransform: 'uppercase' }}>
                                    ✦ LUNAREA FURNITURE ✦
                                </div>
                                <div style={{ fontSize: '10px', marginTop: '4px', letterSpacing: '0.5px', textTransform: 'uppercase', color: '#000', fontWeight: '600', maxWidth: '400px' }}>
                                    DESA KEDUNGPANE, JL. RAYA BOJA, KEC. MIJEN, KOTA SEMARANG, JAWA TENGAH
                                </div>
                                <div style={{ fontSize: '11px', marginTop: '4px', letterSpacing: '0.5px', textTransform: 'uppercase', color: '#000', fontWeight: '800' }}>
                                    TELP: +62 811-2938-160
                                </div>
                            </div>
                            <div style={{ textAlign: 'right' }}>
                                <div style={{ fontSize: '16px', fontWeight: '800', letterSpacing: '4px', textTransform: 'uppercase', border: '3px solid #000', padding: '8px 30px', display: 'inline-block' }}>
                                    RESI PENGIRIMAN
                                </div>
                                <div style={{ marginTop: '5px', fontSize: '11px', fontWeight: '700', textTransform: 'uppercase' }}>
                                    DOKUMEN ASLI PEMESANAN
                                </div>
                            </div>
                        </div>

                        {/* ── INFO UTAMA (NO PESANAN & EKSPEDISI) ── */}
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '20px', marginBottom: '20px', background: '#f9f9f9', padding: '12px', border: '1px solid #ddd' }}>
                            <div>
                                <div style={{ fontSize: '9px', color: '#555', fontWeight: '800', textTransform: 'uppercase', marginBottom: '2px' }}>NO. PENJUALAN</div>
                                <div style={{ fontSize: '16px', fontWeight: '900', fontFamily: 'monospace' }}>{printSale.saleNumber}</div>
                            </div>
                            <div style={{ textAlign: 'center' }}>
                                <div style={{ fontSize: '9px', color: '#555', fontWeight: '800', textTransform: 'uppercase', marginBottom: '2px' }}>METODE PEMBAYARAN</div>
                                <div style={{ fontSize: '15px', fontWeight: '900' }}>{printSale.paymentMethod === 'CREDIT' ? 'TEMPO (CREDIT)' : printSale.paymentMethod}</div>
                            </div>
                            <div style={{ textAlign: 'right' }}>
                                <div style={{ fontSize: '9px', color: '#555', fontWeight: '800', textTransform: 'uppercase', marginBottom: '2px' }}>EKSPEDISI / KURIR</div>
                                <div style={{ fontSize: '15px', fontWeight: '900' }}>{printSale.shippingService?.replace(/_/g, ' ') || '-'}</div>
                            </div>
                        </div>

                        {/* ── BARCODE & TANGGAL ── */}
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', padding: '0 10px' }}>
                             <div style={{ textAlign: 'left' }}>
                                <div style={{ fontSize: '9px', color: '#555', fontWeight: '800', textTransform: 'uppercase', marginBottom: '2px' }}>TANGGAL TRANSAKSI</div>
                                <div style={{ fontSize: '12px', fontWeight: '700' }}>{format(new Date(printSale.createdAt || new Date()), "dd MMMM yyyy, HH:mm 'WIB'")}</div>
                             </div>
                             <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                                <Barcode value={printSale.saleNumber} format="CODE128" width={2} height={40} fontSize={12} font="monospace" margin={0} />
                             </div>
                        </div>

                        {/* ── PENGIRIM & PENERIMA ── */}
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px', marginBottom: '20px' }}>
                            {/* PENGIRIM */}
                            <div style={{ border: '1.5px solid #000' }}>
                                <div style={{ background: '#000', color: '#fff', padding: '5px 12px', fontSize: '10px', fontWeight: '900', textTransform: 'uppercase', letterSpacing: '1px' }}>
                                    PENGIRIM 
                                </div>
                                <div style={{ padding: '10px 12px' }}>
                                    <div style={{ fontWeight: '900', fontSize: '14px', textTransform: 'uppercase', marginBottom: '3px' }}>LUNAREA FURNITURE</div>
                                    <div style={{ fontSize: '11px', fontWeight: '700', marginBottom: '5px' }}>TLP: +62 811-2938-160</div>
                                    <div style={{ fontSize: '10px', lineHeight: '1.5', fontWeight: '600', textTransform: 'uppercase' }}>
                                        DESA KEDUNGPANE, JL. RAYA BOJA, KEC. MIJEN<br/>KOTA SEMARANG, JAWA TENGAH
                                    </div>
                                </div>
                            </div>
                            {/* PENERIMA */}
                            <div style={{ border: '1.5px solid #000' }}>
                                <div style={{ background: '#000', color: '#fff', padding: '5px 12px', fontSize: '10px', fontWeight: '900', textTransform: 'uppercase', letterSpacing: '1px' }}>
                                    PENERIMA
                                </div>
                                <div style={{ padding: '10px 12px' }}>
                                    <div style={{ fontWeight: '900', fontSize: '14px', textTransform: 'uppercase', marginBottom: '3px' }}>{printSale.customerName || 'PELANGGAN UMUM'}</div>
                                    <div style={{ fontSize: '11px', fontWeight: '700', marginBottom: '5px' }}>TLP: {printSale.customerPhone || '-'}</div>
                                    <div style={{ fontSize: '10px', lineHeight: '1.5', fontWeight: '700', textTransform: 'uppercase', whiteSpace: 'pre-wrap' }}>
                                        {printSale.shippingAddress || 'ALAMAT TIDAK TERSEDIA'}
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* ── DAFTAR BARANG ── */}
                        <div style={{ border: '2px solid #000', marginBottom: '20px' }}>
                            <div style={{ background: '#000', color: '#fff', padding: '6px 15px', fontSize: '11px', fontWeight: '900', letterSpacing: '2px', textTransform: 'uppercase' }}>
                                RINCIAN DAFTAR BARANG
                            </div>
                            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                                <thead>
                                    <tr style={{ background: '#f2f2f2', borderBottom: '2px solid #000' }}>
                                        <th style={{ width: '40px', padding: '8px', fontSize: '10px', fontWeight: '900', borderRight: '1.5px solid #000' }}>CEK</th>
                                        <th style={{ textAlign: 'left', padding: '8px', fontSize: '10px', fontWeight: '900', borderRight: '1.5px solid #000' }}>NAMA BARANG & VARIAN</th>
                                        <th style={{ width: '150px', padding: '8px', fontSize: '10px', fontWeight: '900', borderRight: '1.5px solid #000' }}>DIMENSI / BERAT</th>
                                        <th style={{ width: '60px', padding: '8px', fontSize: '10px', fontWeight: '900' }}>JUMLAH</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {printSale.items?.map((item: any, idx: number) => (
                                        <tr key={idx} style={{ borderBottom: '1px solid #000' }}>
                                            <td style={{ textAlign: 'center', padding: '10px', borderRight: '1.5px solid #000' }}>
                                                <div style={{ width: '18px', height: '18px', border: '2px solid #000', margin: '0 auto', borderRadius: '3px' }}></div>
                                            </td>
                                            <td style={{ padding: '10px', borderRight: '1.5px solid #000' }}>
                                                <div style={{ fontWeight: '900', fontSize: '13px', textTransform: 'uppercase' }}>{item.product?.name}</div>
                                                {item.variantName && (
                                                    <div style={{ fontSize: '11px', fontWeight: '700', color: '#000', padding: '2px 0', textTransform: 'uppercase' }}>
                                                        ➤ VARIAN: {item.variantName}
                                                    </div>
                                                )}
                                            </td>
                                            <td style={{ padding: '10px', textAlign: 'center', fontSize: '10px', fontWeight: '700', borderRight: '1.5px solid #000' }}>
                                                {item.product?.length ? `${item.product.length}×${item.product.width}×${item.product.height} cm` : '-'}
                                                <br/>
                                                {item.product?.weight ? `${item.product.weight} kg` : ''}
                                            </td>
                                            <td style={{ padding: '10px', textAlign: 'center', fontSize: '16px', fontWeight: '900' }}>
                                                {item.quantity}
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                                <tfoot>
                                    <tr style={{ background: '#f2f2f2', fontWeight: '900', fontSize: '11px' }}>
                                        <td colSpan={3} style={{ padding: '8px 15px', textAlign: 'right', borderRight: '1.5px solid #000' }}>TOTAL JUMLAH BARANG (QTY) :</td>
                                        <td style={{ padding: '8px', textAlign: 'center', fontSize: '16px' }}>
                                            {printSale.items?.reduce((ttl: number, it: any) => ttl + (it.quantity || 1), 0)}
                                        </td>
                                    </tr>
                                </tfoot>
                            </table>
                        </div>

                        {/* ── FOOTER SECTION ── */}
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
                            {/* NOTES & WARNING */}
                            <div>
                                {printSale.notes && (
                                    <div style={{ border: '1.5px dashed #000', padding: '10px', marginBottom: '10px' }}>
                                        <div style={{ fontSize: '9px', fontWeight: '900', textTransform: 'uppercase', marginBottom: '3px' }}>CATATAN PESANAN:</div>
                                        <div style={{ fontSize: '11px', fontWeight: '700', textTransform: 'uppercase' }}>{printSale.notes}</div>
                                    </div>
                                )}
                                <div style={{ border: '2px solid #000', padding: '10px', textAlign: 'center', background: '#ffff00' }}>
                                    <div style={{ fontWeight: '900', fontSize: '15px' }}>⚠ AWAS MUDAH LECET ⚠</div>
                                    <div style={{ fontSize: '10px', fontWeight: '900', marginTop: '2px' }}>JANGAN DIBANTING / DITUMPUK BERAT</div>
                                </div>
                            </div>
                            {/* THANKS & UNBOXING */}
                            <div style={{ textAlign: 'center', display: 'flex', flexDirection: 'column', justifyContent: 'center', border: '1.5px solid #000', padding: '10px' }}>
                                <div style={{ fontSize: '11px', fontWeight: '900', marginBottom: '5px' }}>TERIMA KASIH TELAH BERBELANJA</div>
                                <div style={{ fontSize: '13px', fontWeight: '700' }}>✦ LUNAREA FURNITURE ✦</div>
                                <div style={{ fontSize: '9px', marginTop: '10px', background: '#000', color: '#fff', padding: '4px', fontWeight: '700' }}>
                                    WAJIB VIDEO UNBOXING UNTUK KLAIM GARANSI
                                </div>
                            </div>
                        </div>

                    </div>
                    );

                    return (
                        <>
                            <style type="text/css" media="print">
                                {`
                                  @page { size: A4 portrait; margin: 0; }
                                  body { margin: 0; padding: 0; }
                                  @media print {
                                    .print-root { padding: 10mm; width: 210mm; box-sizing: border-box; }
                                    .cut-line { margin-top: 25px; border-bottom: 2px dashed #999; width: 100%; position: relative; }
                                    .cut-label { position: absolute; left: 50%; top: -10px; transform: translateX(-50%); background: #fff; padding: 0 15px; font-size: 11px; color: #999; font-weight: bold; }
                                  }
                                `}
                            </style>
                            <div className="print-root">
                                {renderReceipt()}
                                <div className="cut-line">
                                    <span className="cut-label">✂ POTONG DI SINI UNTUK PENGGUNAAN ULANG KERTAS ✂</span>
                                </div>
                            </div>
                        </>
                    );
                })()}
            </div>
        </div>
    </div>
  );
}
