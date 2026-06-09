'use client';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Separator } from '@/components/ui/separator';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useSettingsStore } from '@/lib/stores/settings';
import type { PrimaryColor } from '@/lib/stores/settings';
import { useAuth } from '@/lib/hooks/useAuth';
import { useTheme } from 'next-themes';
import { Moon, Sun, Laptop, Type, Info, Code, Cpu, ExternalLink, ShieldCheck, Heart, Palette, Printer } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { PrinterSettings } from '@/components/settings/PrinterSettings';

export default function SettingsPage() {
  const { 
    theme: storeTheme, 
    fontSize, 
    primaryColor,
    setTheme: setStoreTheme, 
    setFontSize,
    setPrimaryColor
  } = useSettingsStore();
  const { user } = useAuth();
  const isUser = user?.role === 'USER';
  const { setTheme: setNextTheme } = useTheme();

  const handleThemeChange = (value: string) => {
    const newTheme = value as 'light' | 'dark' | 'system';
    setStoreTheme(newTheme);
    setNextTheme(newTheme);
  };

  const handleFontSizeChange = (value: string) => {
    const newSize = value as 'small' | 'medium' | 'large';
    setFontSize(newSize);
  };

  const handleColorChange = (value: string) => {
    const newColor = value as PrimaryColor;
    setPrimaryColor(newColor);
  };

  const colorOptions = [
    { label: 'Umber', value: 'umber', color: '#956818' },
    { label: 'Slate', value: 'slate', color: '#64748b' },
    { label: 'Biru', value: 'blue', color: '#3b82f6' },
    { label: 'Hijau', value: 'green', color: '#10b981' },
    { label: 'Ungu', value: 'violet', color: '#8b5cf6' },
    { label: 'Jingga', value: 'orange', color: '#f97316' },
    { label: 'Pink', value: 'pink', color: '#ec4899' },
    { label: 'Rose', value: 'rose', color: '#f43f5e' },
    { label: 'Amber', value: 'amber', color: '#f59e0b' },
  ];

  return (
    <div className="space-y-6">
      <div className="animate-in">
        <h1 className="text-3xl font-bold tracking-tight text-gradient">Pengaturan</h1>
        <p className="text-muted-foreground mt-1">
          Kelola preferensi aplikasi Anda
        </p>
      </div>
      <Separator />
      
      <Tabs defaultValue="ui" className="space-y-6">
        <TabsList className={`grid w-full max-w-md ${isUser ? 'grid-cols-1' : 'grid-cols-2'}`}>
          <TabsTrigger value="ui">
            <Palette className="h-4 w-4 mr-2" />
            Tampilan
          </TabsTrigger>
          {!isUser && (
            <TabsTrigger value="printer">
              <Printer className="h-4 w-4 mr-2" />
              Printer
            </TabsTrigger>
          )}
        </TabsList>

        <TabsContent value="ui" className="space-y-6">
          <div className="grid gap-6">
        <Card className="animate-in [animation-delay:100ms] border-none shadow-none bg-transparent">
          <CardHeader className="px-0">
            <CardTitle className="flex items-center gap-2 text-xl">
              <Palette className="h-5 w-5 text-primary" />
              Warna Tema
            </CardTitle>
            <CardDescription>
              Pilih warna aksen utama untuk identitas aplikasi Anda.
            </CardDescription>
          </CardHeader>
          <CardContent className="px-0">
            <RadioGroup 
              defaultValue={primaryColor} 
              value={primaryColor}
              onValueChange={handleColorChange}
              className="grid grid-cols-2 sm:grid-cols-5 gap-4"
            >
              {colorOptions.map((option) => (
                <div key={option.value}>
                  <RadioGroupItem value={option.value} id={`color-${option.value}`} className="peer sr-only" />
                  <Label
                    htmlFor={`color-${option.value}`}
                    className={cn(
                      "flex flex-col items-center justify-center gap-2 rounded-xl border-2 border-muted bg-card p-4 hover:bg-accent cursor-pointer transition-all duration-200 peer-data-[state=checked]:border-primary peer-data-[state=checked]:bg-primary/5",
                    )}
                  >
                    <div className="h-6 w-6 rounded-full shadow-sm" style={{ backgroundColor: option.color }} />
                    <span className="text-sm font-medium">{option.label}</span>
                  </Label>
                </div>
              ))}
            </RadioGroup>
          </CardContent>
        </Card>

        <Card className="animate-in [animation-delay:150ms] border-none shadow-none bg-transparent">
          <CardHeader className="px-0">
            <CardTitle className="flex items-center gap-2 text-xl">
              <Sun className="h-5 w-5 text-primary" />
              Tampilan
            </CardTitle>
            <CardDescription>
              Sesuaikan tema aplikasi (Terang/Gelap) sesuai preferensi Anda.
            </CardDescription>
          </CardHeader>
          <CardContent className="px-0">
            <RadioGroup 
              defaultValue={storeTheme} 
              value={storeTheme}
              onValueChange={handleThemeChange}
              className="grid grid-cols-3 gap-4"
            >
              <div>
                <RadioGroupItem value="light" id="theme-light" className="peer sr-only" />
                <Label
                  htmlFor="theme-light"
                  className="flex flex-col items-center justify-between rounded-xl border-2 border-muted bg-card p-4 hover:bg-accent hover:text-accent-foreground peer-data-[state=checked]:border-primary peer-data-[state=checked]:bg-primary/5 [&:has([data-state=checked])]:border-primary cursor-pointer transition-all duration-200"
                >
                  <Sun className="mb-3 h-6 w-6" />
                  Terang
                </Label>
              </div>
              <div>
                <RadioGroupItem value="dark" id="theme-dark" className="peer sr-only" />
                <Label
                  htmlFor="theme-dark"
                  className="flex flex-col items-center justify-between rounded-xl border-2 border-muted bg-card p-4 hover:bg-accent hover:text-accent-foreground peer-data-[state=checked]:border-primary peer-data-[state=checked]:bg-primary/5 [&:has([data-state=checked])]:border-primary cursor-pointer transition-all duration-200"
                >
                  <Moon className="mb-3 h-6 w-6" />
                  Gelap
                </Label>
              </div>
              <div>
                <RadioGroupItem value="system" id="theme-system" className="peer sr-only" />
                <Label
                  htmlFor="theme-system"
                  className="flex flex-col items-center justify-between rounded-xl border-2 border-muted bg-card p-4 hover:bg-accent hover:text-accent-foreground peer-data-[state=checked]:border-primary peer-data-[state=checked]:bg-primary/5 [&:has([data-state=checked])]:border-primary cursor-pointer transition-all duration-200"
                >
                  <Laptop className="mb-3 h-6 w-6" />
                  Sistem
                </Label>
              </div>
            </RadioGroup>
          </CardContent>
        </Card>

        <Card className="animate-in [animation-delay:200ms] border-none shadow-none bg-transparent">
          <CardHeader className="px-0">
            <CardTitle className="flex items-center gap-2 text-xl">
              <Type className="h-5 w-5 text-primary" />
              Ukuran Font
            </CardTitle>
            <CardDescription>
              Atur ukuran teks agar lebih nyaman dibaca.
            </CardDescription>
          </CardHeader>
          <CardContent className="px-0">
             <RadioGroup 
              defaultValue={fontSize} 
              value={fontSize}
              onValueChange={handleFontSizeChange}
              className="grid grid-cols-3 gap-4"
            >
              <div>
                <RadioGroupItem value="small" id="font-small" className="peer sr-only" />
                <Label
                  htmlFor="font-small"
                  className="flex flex-col items-center justify-between rounded-xl border-2 border-muted bg-card p-4 hover:bg-accent hover:text-accent-foreground peer-data-[state=checked]:border-primary peer-data-[state=checked]:bg-primary/5 [&:has([data-state=checked])]:border-primary cursor-pointer transition-all duration-200"
                >
                  <span className="text-sm font-bold mb-3">Aa</span>
                  Kecil
                </Label>
              </div>
              <div>
                <RadioGroupItem value="medium" id="font-medium" className="peer sr-only" />
                <Label
                  htmlFor="font-medium"
                  className="flex flex-col items-center justify-between rounded-xl border-2 border-muted bg-card p-4 hover:bg-accent hover:text-accent-foreground peer-data-[state=checked]:border-primary peer-data-[state=checked]:bg-primary/5 [&:has([data-state=checked])]:border-primary cursor-pointer transition-all duration-200"
                >
                  <span className="text-base font-bold mb-3">Aa</span>
                  Sedang
                </Label>
              </div>
              <div>
                <RadioGroupItem value="large" id="font-large" className="peer sr-only" />
                <Label
                  htmlFor="font-large"
                  className="flex flex-col items-center justify-between rounded-xl border-2 border-muted bg-card p-4 hover:bg-accent hover:text-accent-foreground peer-data-[state=checked]:border-primary peer-data-[state=checked]:bg-primary/5 [&:has([data-state=checked])]:border-primary cursor-pointer transition-all duration-200"
                >
                  <span className="text-lg font-bold mb-3">Aa</span>
                  Besar
                </Label>
              </div>
            </RadioGroup>
            
            <div className="mt-8 p-6 border rounded-xl bg-primary/5 border-primary/20 animate-in [animation-delay:300ms]">
              <div className="flex items-center gap-2 mb-3">
                <div className="p-1.5 bg-primary/10 rounded-md">
                  <Type className="h-4 w-4 text-primary" />
                </div>
                  <p className="text-sm font-semibold text-foreground">Contoh Teks</p>
              </div>
              <p className="text-muted-foreground leading-relaxed">
                Ini adalah contoh teks dengan ukuran font yang Anda pilih. 
                Pengaturan ini akan diterapkan ke seluruh aplikasi untuk kenyamanan membaca Anda. 
                Kami merekomendasikan ukuran "Sedang" untuk sebagian besar pengguna.
              </p>
            </div>
          </CardContent>
        </Card>


      </div>
       </TabsContent>

        {!isUser && (
          <TabsContent value="printer" className="space-y-6">
            <PrinterSettings />
          </TabsContent>
        )}
      </Tabs>
    </div>
  );
}
