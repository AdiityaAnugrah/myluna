'use client';

import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Home } from 'lucide-react';

export default function NotFound() {
  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-gray-50 p-4">
      <div className="text-center space-y-6 max-w-md">
        <h1 className="text-9xl font-bold text-gray-200">404</h1>
        <div className="space-y-2">
          <h2 className="text-2xl font-bold text-gray-900">Halaman Tidak Ditemukan</h2>
          <p className="text-gray-500">
            Maaf,halaman yang Anda cari tidak dapat ditemukan atau telah dipindahkan.
          </p>
        </div>
        <Link href="/">
          <Button className="w-full">
            <Home className="mr-2 h-4 w-4" />
            Kembali ke Beranda
          </Button>
        </Link>
      </div>
    </div>
  );
}
