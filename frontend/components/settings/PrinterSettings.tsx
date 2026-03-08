'use client';

import { useState, useEffect, useRef } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { Printer, Wifi, CheckCircle2, AlertCircle, HelpCircle } from 'lucide-react';
import { toast } from 'sonner';
import { useReactToPrint } from 'react-to-print';
import { TestPrintReceipt } from './TestPrintReceipt';

export function PrinterSettings() {
  const [printerName, setPrinterName] = useState('');
  const testPrintRef = useRef<HTMLDivElement>(null);

  // Load preferences from localStorage
  useEffect(() => {
    const saved = localStorage.getItem('printerPreferences');
    if (saved) {
      try {
        const { printerName: savedName } = JSON.parse(saved);
        if (savedName) setPrinterName(savedName);
      } catch (error) {
        console.error('Failed to load printer preferences:', error);
      }
    }
  }, []);

  const handleSavePreferences = () => {
    const preferences = {
      printerName,
      lastSaved: new Date().toISOString(),
    };
    
    localStorage.setItem('printerPreferences', JSON.stringify(preferences));
    toast.success('Preferensi printer berhasil disimpan');
  };

  const handleTestPrint = useReactToPrint({
    contentRef: testPrintRef,
    onAfterPrint: () => {
      toast.success('Print dialog ditutup');
    },
    onPrintError: (error) => {
      toast.error('Gagal membuka print dialog: ' + error);
    },
  });

  return (
    <div className="space-y-6">
      {/* WiFi Printer Setup Guide */}
      <Card className="border-primary/20">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Wifi className="h-5 w-5 text-primary" />
            Panduan Setup WiFi Printer
          </CardTitle>
          <CardDescription>
            Ikuti langkah-langkah berikut untuk menghubungkan printer WiFi Anda
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4">
            {/* Step-by-step Guide */}
            <div className="flex gap-3">
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary text-sm font-semibold text-primary-foreground">
                1
              </div>
              <div className="space-y-1">
                <p className="font-semibold">Hubungkan Printer ke WiFi</p>
                <p className="text-sm text-muted-foreground">
                  Gunakan tombol WiFi di printer atau menu LCD untuk connect ke jaringan WiFi yang sama dengan komputer Anda.
                  Pastikan printer sudah terhubung dan mendapat alamat IP.
                </p>
              </div>
            </div>

            <div className="flex gap-3">
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary text-sm font-semibold text-primary-foreground">
                2
              </div>
              <div className="space-y-1">
                <p className="font-semibold">Tambahkan Printer di Windows</p>
                <p className="text-sm text-muted-foreground">
                  Buka Settings → Devices → Printers & Scanners → "Add a printer or scanner".
                  Windows akan otomatis mendeteksi printer WiFi Anda dalam beberapa detik.
                </p>
              </div>
            </div>

            <div className="flex gap-3">
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary text-sm font-semibold text-primary-foreground">
                3
              </div>
              <div className="space-y-1">
                <p className="font-semibold">Test Print</p>
                <p className="text-sm text-muted-foreground">
                  Gunakan tombol "Test Print" di bawah untuk memastikan printer terhubung dengan baik.
                </p>
              </div>
            </div>
          </div>

          {/* Troubleshooting Accordion */}
          <Accordion type="single" collapsible className="w-full">
            <AccordionItem value="troubleshoot">
              <AccordionTrigger>
                <div className="flex items-center gap-2">
                  <HelpCircle className="h-4 w-4" />
                  <span>Troubleshooting & Tips</span>
                </div>
              </AccordionTrigger>
              <AccordionContent className="space-y-3 text-sm">
                <div>
                  <p className="font-semibold flex items-center gap-2">
                    <AlertCircle className="h-4 w-4 text-orange-500" />
                    Printer tidak terdeteksi?
                  </p>
                  <ul className="list-disc list-inside mt-1 text-muted-foreground space-y-1 ml-6">
                    <li>Pastikan printer dan komputer terhubung ke WiFi yang sama</li>
                    <li>Restart printer dan tunggu 1-2 menit</li>
                    <li>Pastikan firewall tidak memblokir koneksi printer</li>
                    <li>Coba tambahkan printer secara manual dengan memasukkan IP address</li>
                  </ul>
                </div>

                <div>
                  <p className="font-semibold flex items-center gap-2">
                    <CheckCircle2 className="h-4 w-4 text-green-500" />
                    Tips untuk hasil terbaik:
                  </p>
                  <ul className="list-disc list-inside mt-1 text-muted-foreground space-y-1 ml-6">
                    <li>Gunakan printer thermal 58mm atau 80mm untuk resi pengiriman</li>
                    <li>Set printer sebagai "Default Printer" untuk akses lebih cepat</li>
                    <li>Pastikan kertas thermal terinstall dengan benar</li>
                    <li>Untuk Mac/Linux, gunakan CUPS atau driver printer yang sesuai</li>
                  </ul>
                </div>
              </AccordionContent>
            </AccordionItem>
          </Accordion>
        </CardContent>
      </Card>

      {/* Printer Preferences */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Printer className="h-5 w-5 text-primary" />
            Preferensi Printer
          </CardTitle>
          <CardDescription>
            Simpan nama printer favorit Anda untuk referensi cepat
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="printer-name">Nama Printer</Label>
            <Input
              id="printer-name"
              placeholder="Contoh: EPSON TM-T82, HP LaserJet"
              value={printerName}
              onChange={(e) => setPrinterName(e.target.value)}
            />
            <p className="text-xs text-muted-foreground">
              Nama printer akan disimpan untuk referensi. Anda tetap bisa memilih printer lain saat print dialog muncul.
            </p>
          </div>
          <Button onClick={handleSavePreferences} disabled={!printerName.trim()}>
            Simpan Preferensi
          </Button>
        </CardContent>
      </Card>

      {/* Test Print */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Printer className="h-5 w-5 text-primary" />
            Test Print
          </CardTitle>
          <CardDescription>
            Cetak sample resi untuk memastikan printer terhubung dengan baik
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="rounded-lg border p-4 bg-muted/30">
            <p className="text-sm text-muted-foreground mb-3">
              Klik tombol di bawah untuk membuka print dialog. Pilih printer WiFi Anda dan klik Print.
              {printerName && (
                <span className="block mt-1 font-medium text-foreground">
                  Printer tersimpan: {printerName}
                </span>
              )}
            </p>
            <Button onClick={() => handleTestPrint()} className="w-full sm:w-auto">
              <Printer className="h-4 w-4 mr-2" />
              Test Print
            </Button>
          </div>

          {/* Hidden component for printing */}
          <div className="hidden">
            <TestPrintReceipt ref={testPrintRef} />
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
