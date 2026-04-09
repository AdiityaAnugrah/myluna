'use client';

import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { useOmsetBreakdown } from '@/lib/hooks/useFinancial';
import { 
  Loader2, 
  BarChart3, 
  Download, 
} from 'lucide-react';
import * as XLSX from 'xlsx';

interface OmsetBreakdownModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function OmsetBreakdownModal({ isOpen, onClose }: OmsetBreakdownModalProps) {
  const { data, isLoading } = useOmsetBreakdown({ enabled: isOpen });
  
  const [selectedMonthly, setSelectedMonthly] = useState<string[]>([]);
  const [selectedYearly, setSelectedYearly] = useState<number[]>([]);
  const [activeTab, setActiveTab] = useState('monthly');

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(value);
  };

  const getMonthName = (month: number) => {
    const months = [
      'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
      'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'
    ];
    return months[month - 1];
  };

  const monthlyData = data?.data?.monthly || [];
  const yearlyData = data?.data?.yearly || [];
  const grandTotal = data?.data?.grandTotal || 0;

  const handleToggleMonthly = (id: string) => {
    setSelectedMonthly(prev => 
      prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]
    );
  };

  const handleSelectAllMonthly = () => {
    if (selectedMonthly.length === monthlyData.length) {
      setSelectedMonthly([]);
    } else {
      setSelectedMonthly(monthlyData.map((item: any) => `${item.year}-${item.month}`));
    }
  };

  const handleToggleYearly = (year: number) => {
    setSelectedYearly(prev => 
      prev.includes(year) ? prev.filter(y => y !== year) : [...prev, year]
    );
  };

  const handleSelectAllYearly = () => {
    if (selectedYearly.length === yearlyData.length) {
      setSelectedYearly([]);
    } else {
      setSelectedYearly(yearlyData.map((item: any) => item.year));
    }
  };

  const handleExportExcel = () => {
    if ((activeTab === 'monthly' && monthlyData.length === 0) || (activeTab === 'yearly' && yearlyData.length === 0)) {
      import('sonner').then(({ toast }) => toast.error('Data kosong! Fitur Export tidak dapat berjalan tanpa data dari server.'));
      return;
    }
    const wb = XLSX.utils.book_new();
    const todayStr = new Date().toLocaleDateString('id-ID', { day: '2-digit', month: 'long', year: 'numeric' });
    
    const aoa: any[][] = [
      ['LUNAREA FURNITURE'],
      [`Rincian Omset Penjualan (${activeTab === 'monthly' ? 'Bulanan' : 'Tahunan'})`],
      [`Dicetak pada: ${todayStr}`],
      [],
    ];

    if (activeTab === 'monthly') {
      const itemsToExport = selectedMonthly.length > 0 
        ? monthlyData.filter((item: any) => selectedMonthly.includes(`${item.year}-${item.month}`))
        : monthlyData;
      
      aoa.push(['No', 'Bulan', 'Tahun', 'Total Omset (IDR)']);
      itemsToExport.forEach((item: any, idx: number) => {
        aoa.push([
          idx + 1,
          getMonthName(item.month),
          item.year,
          formatCurrency(item.total)
        ]);
      });
    } else {
      const itemsToExport = selectedYearly.length > 0
        ? yearlyData.filter((item: any) => selectedYearly.includes(item.year))
        : yearlyData;
      
      aoa.push(['No', 'Tahun', 'Total Omset (IDR)']);
      itemsToExport.forEach((item: any, idx: number) => {
        aoa.push([
          idx + 1,
          item.year,
          formatCurrency(item.total)
        ]);
      });
    }

    const ws = XLSX.utils.aoa_to_sheet(aoa);
    
    // Auto column width
    ws['!cols'] = [
      { wch: 8 },  // No
      { wch: 15 }, // Bulan/Tahun
      { wch: 10 }, // Tahun (for monthly)
      { wch: 25 }, // Total
    ];

    XLSX.utils.book_append_sheet(wb, ws, 'Rincian Omset');
    const fileName = activeTab === 'monthly' ? 'Omset_Bulanan_Lunarea.xlsx' : 'Omset_Tahunan_Lunarea.xlsx';
    XLSX.writeFile(wb, fileName);
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-hidden flex flex-col gap-0 p-0">
        <DialogHeader className="p-6 border-b">
          <div className="flex items-center justify-between gap-4">
            <DialogTitle className="text-xl font-bold flex items-center gap-2">
              <BarChart3 className="h-5 w-5 text-orange-500" />
              Rincian Omset Penjualan
            </DialogTitle>
            {!isLoading && (
              <Button 
                variant="outline" 
                size="sm" 
                onClick={handleExportExcel}
                className="border-orange-500 text-orange-600 hover:bg-orange-50 dark:hover:bg-orange-950/30 font-semibold"
              >
                <Download className="h-4 w-4 mr-2" />
                Export Excel
                {activeTab === 'monthly' 
                  ? (selectedMonthly.length > 0 && ` (${selectedMonthly.length})`) 
                  : (selectedYearly.length > 0 && ` (${selectedYearly.length})`)}
              </Button>
            )}
          </div>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {isLoading ? (
            <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
              <Loader2 className="h-8 w-8 animate-spin mb-2" />
              <p>Memuat data rincian...</p>
            </div>
          ) : (
            <>
              {/* Summary Card - Luna Style */}
              <div className="bg-orange-500/5 border border-orange-500/20 rounded-xl p-4 flex items-center justify-between">
                <div>
                  <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Total Omset Seluruh Waktu</p>
                  <p className="text-2xl font-bold text-orange-500">{formatCurrency(grandTotal)}</p>
                </div>
                <div className="bg-orange-500/10 p-2 rounded-lg">
                  <BarChart3 className="h-8 w-8 text-orange-500" />
                </div>
              </div>

              <Tabs defaultValue="monthly" className="w-full" onValueChange={setActiveTab}>
                <div className="flex items-center justify-between mb-4">
                  <TabsList>
                    <TabsTrigger value="monthly">Bulanan</TabsTrigger>
                    <TabsTrigger value="yearly">Tahunan</TabsTrigger>
                  </TabsList>
                  <p className="text-xs text-muted-foreground">
                    {activeTab === 'monthly' ? selectedMonthly.length : selectedYearly.length} baris dipilih
                  </p>
                </div>

                <TabsContent value="monthly" className="mt-0">
                  <div className="rounded-md border overflow-hidden">
                    <Table>
                      <TableHeader className="bg-muted/50">
                        <TableRow>
                          <TableHead className="w-12 text-center">
                            <Checkbox 
                              checked={selectedMonthly.length === monthlyData.length && monthlyData.length > 0}
                              onCheckedChange={handleSelectAllMonthly}
                            />
                          </TableHead>
                          <TableHead className="font-bold">Bulan</TableHead>
                          <TableHead className="font-bold">Tahun</TableHead>
                          <TableHead className="text-right font-bold">Omset</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {monthlyData.map((item: any) => {
                          const id = `${item.year}-${item.month}`;
                          const isSelected = selectedMonthly.includes(id);
                          return (
                            <TableRow 
                              key={id} 
                              className={`cursor-pointer transition-colors ${isSelected ? 'bg-orange-500/5' : ''}`}
                              onClick={() => handleToggleMonthly(id)}
                            >
                              <TableCell className="text-center" onClick={(e) => e.stopPropagation()}>
                                <Checkbox 
                                  checked={isSelected}
                                  onCheckedChange={() => handleToggleMonthly(id)}
                                />
                              </TableCell>
                              <TableCell className="font-medium">{getMonthName(item.month)}</TableCell>
                              <TableCell>{item.year}</TableCell>
                              <TableCell className="text-right font-bold text-orange-600">
                                {formatCurrency(item.total)}
                              </TableCell>
                            </TableRow>
                          );
                        })}
                      </TableBody>
                    </Table>
                  </div>
                </TabsContent>

                <TabsContent value="yearly" className="mt-0">
                  <div className="rounded-md border overflow-hidden">
                    <Table>
                      <TableHeader className="bg-muted/50">
                        <TableRow>
                          <TableHead className="w-12 text-center">
                            <Checkbox 
                              checked={selectedYearly.length === yearlyData.length && yearlyData.length > 0}
                              onCheckedChange={handleSelectAllYearly}
                            />
                          </TableHead>
                          <TableHead className="font-bold">Tahun</TableHead>
                          <TableHead className="text-right font-bold">Total Omset</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {yearlyData.map((item: any) => {
                          const isSelected = selectedYearly.includes(item.year);
                          return (
                            <TableRow 
                              key={item.year} 
                              className={`cursor-pointer transition-colors ${isSelected ? 'bg-orange-500/5' : ''}`}
                              onClick={() => handleToggleYearly(item.year)}
                            >
                              <TableCell className="text-center" onClick={(e) => e.stopPropagation()}>
                                <Checkbox 
                                  checked={isSelected}
                                  onCheckedChange={() => handleToggleYearly(item.year)}
                                />
                              </TableCell>
                              <TableCell className="font-bold text-lg">{item.year}</TableCell>
                              <TableCell className="text-right font-bold text-2xl text-orange-600">
                                {formatCurrency(item.total)}
                              </TableCell>
                            </TableRow>
                          );
                        })}
                      </TableBody>
                    </Table>
                  </div>
                </TabsContent>
              </Tabs>
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
