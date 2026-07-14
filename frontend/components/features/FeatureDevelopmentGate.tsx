'use client';

import type { ReactNode } from 'react';
import { usePathname } from 'next/navigation';
import Link from 'next/link';
import { AlertTriangle, ArrowLeft, Code2, Construction, ShieldCheck, Sparkles, Wrench } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { useFeatureByPath } from '@/lib/hooks/useFeatures';
import { useAuthStore } from '@/lib/stores/auth';

function DevBanner({ label }: { label: string }) {
  return (
    <div className="mb-4 rounded-2xl border border-amber-200 bg-amber-50 p-3 text-amber-950">
      <div className="flex flex-wrap items-center gap-2 text-xs font-medium">
        <AlertTriangle className="h-4 w-4 text-amber-600" />
        <Badge variant="outline" className="border-amber-300 bg-white text-amber-800">
          DEV Preview
        </Badge>
        <span>
          Fitur <strong>{label}</strong> sedang maintenance. Role lain melihat halaman maintenance, hanya DEV yang bisa membuka fitur ini.
        </span>
      </div>
    </div>
  );
}

function MaintenanceView({ label }: { label: string }) {
  return (
    <div className="flex min-h-[calc(100dvh-9rem)] items-center justify-center">
      <div className="relative w-full max-w-3xl overflow-hidden rounded-3xl border bg-background p-8 text-center shadow-xl">
        <div className="absolute -left-16 -top-16 h-40 w-40 animate-pulse rounded-full bg-amber-200/40 blur-3xl" />
        <div className="absolute -bottom-20 -right-16 h-48 w-48 animate-pulse rounded-full bg-primary/20 blur-3xl" />

        <div className="relative mx-auto mb-6 flex h-28 w-28 items-center justify-center">
          <div className="absolute inset-0 animate-spin rounded-full border-4 border-dashed border-amber-300" />
          <div className="absolute inset-4 animate-pulse rounded-full bg-amber-100" />
          <Construction className="relative h-12 w-12 text-amber-600" />
          <Sparkles className="absolute right-0 top-2 h-5 w-5 animate-bounce text-primary" />
          <Wrench className="absolute bottom-2 left-1 h-5 w-5 animate-pulse text-slate-500" />
        </div>

        <Badge className="mb-4 bg-amber-500 text-white hover:bg-amber-500">Fitur Sedang Maintenance</Badge>
        <h1 className="text-2xl font-bold tracking-tight md:text-3xl">{label} sedang dalam pengembangan</h1>
        <p className="mx-auto mt-3 max-w-xl text-sm leading-6 text-muted-foreground">
          Untuk menjaga data tetap aman dan tidak kacau, fitur ini sementara dikunci. Silakan gunakan menu lain dulu,
          atau tunggu sampai tim DEV mengaktifkan kembali fitur ini.
        </p>

        <div className="mt-6 grid gap-3 text-left sm:grid-cols-3">
          <div className="rounded-2xl border bg-muted/40 p-4">
            <ShieldCheck className="mb-2 h-5 w-5 text-green-600" />
            <p className="text-sm font-semibold">Data aman</p>
            <p className="text-xs text-muted-foreground">Akses fitur dikunci sementara.</p>
          </div>
          <div className="rounded-2xl border bg-muted/40 p-4">
            <Code2 className="mb-2 h-5 w-5 text-primary" />
            <p className="text-sm font-semibold">Sedang dikerjakan</p>
            <p className="text-xs text-muted-foreground">Tim DEV sedang cek dan revisi.</p>
          </div>
          <div className="rounded-2xl border bg-muted/40 p-4">
            <Sparkles className="mb-2 h-5 w-5 text-amber-600" />
            <p className="text-sm font-semibold">Akan aktif lagi</p>
            <p className="text-xs text-muted-foreground">Setelah aman, fitur dibuka kembali.</p>
          </div>
        </div>

        <div className="mt-8 flex flex-col justify-center gap-3 sm:flex-row">
          <Button asChild variant="outline">
            <Link href="/">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Kembali ke Dasbor
            </Link>
          </Button>
          <Button asChild>
            <Link href="/settings">Buka Pengaturan</Link>
          </Button>
        </div>
      </div>
    </div>
  );
}

export function FeatureDevelopmentGate({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const { feature, isLoading } = useFeatureByPath(pathname);
  const user = useAuthStore((state) => state.user);
  const role = user?.isTestingMode ? 'SUPER_ADMIN' : user?.role;

  if (isLoading) {
    return (
      <div className="flex min-h-[50dvh] items-center justify-center">
        <div className="flex flex-col items-center gap-3 text-sm text-muted-foreground">
          <div className="h-10 w-10 animate-spin rounded-full border-4 border-primary border-t-transparent" />
          Mengecek status fitur...
        </div>
      </div>
    );
  }

  if (feature?.isDevelopment && role !== 'DEV') {
    return <MaintenanceView label={feature.label} />;
  }

  return (
    <>
      {feature?.isDevelopment && role === 'DEV' && <DevBanner label={feature.label} />}
      {children}
    </>
  );
}
