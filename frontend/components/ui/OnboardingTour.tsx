'use client';

import { useEffect, useState } from 'react';
import dynamic from 'next/dynamic';
import { usePathname } from 'next/navigation';
import { useAuth } from '@/lib/hooks/useAuth';
import { useTheme } from 'next-themes';

// Dynamically import Joyride to avoid SSR issues
const Joyride = dynamic(() => import('react-joyride'), { ssr: false });

export function OnboardingTour() {
  const pathname = usePathname();
  const { user } = useAuth();
  const { theme } = useTheme();
  const [run, setRun] = useState(false);
  const [steps, setSteps] = useState<any[]>([]);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  // Only run the tour for the USER role
  useEffect(() => {
    if (!mounted || user?.role !== 'USER') {
      setRun(false);
      return;
    }

    // Check if the tour for this specific path has already been completed by this user
    const tourKey = `tour_completed_${user.id}_${pathname}`;
    const hasCompletedTour = localStorage.getItem(tourKey);

    if (hasCompletedTour) {
      setRun(false);
      return;
    }

    // Define steps based on the current pathname
    let newSteps: any[] = [];

    if (pathname === '/') {
      newSteps = [
        {
          target: 'body',
          placement: 'center',
          content: 'Selamat datang di Dasbor Utama! Ini adalah pusat informasi Anda. Mari kita lihat fitur-fitur yang tersedia.',
          disableBeacon: true,
        },
        {
          target: '.tour-dashboard-stats',
          content: 'Di sini Anda dapat melihat ringkasan statistik cepat seperti total pendapatan, produk aktif, dan peringatan stok menipis.',
        },
        {
          target: '.tour-sidebar-nav',
          content: 'Gunakan menu navigasi ini untuk mengakses halaman lain seperti Produk, Penjualan, dan Keuangan.',
        },
        {
          target: '.tour-recent-transactions',
          content: 'Tabel ini menampilkan transaksi terbaru yang terjadi di sistem.',
        }
      ];
    } else if (pathname === '/products') {
      newSteps = [
        {
          target: '.tour-products-list',
          content: 'Ini adalah halaman Daftar Produk. Anda dapat mengelola semua barang di sini.',
          disableBeacon: true,
        },
        {
          target: '.tour-products-add',
          content: 'Klik tombol ini untuk menambahkan produk baru ke dalam sistem.',
        },
        {
          target: '.tour-products-search',
          content: 'Gunakan fitur pencarian dan filter ini untuk menemukan produk dengan cepat.',
        }
      ];
    } else if (pathname === '/stock') {
      newSteps = [
        {
          target: '.tour-stock-status',
          content: 'Halaman Stok Barang membantu Anda memantau ketersediaan barang.',
          disableBeacon: true,
        },
        {
          target: '.tour-stock-history',
          content: 'Anda juga dapat melihat riwayat pergerakan stok (masuk/keluar) di sini.',
        }
      ];
    } else if (pathname === '/sales') {
      newSteps = [
        {
          target: '.tour-sales-list',
          content: 'Ini adalah halaman Penjualan tempat Anda dapat melihat riwayat semua transaksi.',
          disableBeacon: true,
        },
        {
          target: '.tour-sales-add',
          content: 'Klik tombol ini untuk membuat transaksi penjualan baru.',
        }
      ];
    } else if (pathname === '/settlements') {
      newSteps = [
        {
          target: '.tour-settlements-list',
          content: 'Di halaman Pelunasan, Anda dapat melacak pencairan dana dari berbagai platform.',
          disableBeacon: true,
        },
        {
          target: '.tour-settlements-status',
          content: 'Perhatikan status pelunasan untuk mengetahui transaksi mana yang sudah cair dan yang masih pending.',
        }
      ];
    }

    if (newSteps.length > 0) {
      setSteps(newSteps);
      setRun(true);
    } else {
      setRun(false);
    }
  }, [pathname, user, mounted]);

  // Robust cleanup function for scroll locking
  const cleanupScrollLock = () => {
    if (typeof window !== 'undefined') {
      document.body.style.overflow = '';
      document.body.style.position = '';
      document.body.style.height = '';
      document.documentElement.style.overflow = '';
    }
  };

  // Always restore body scroll when tour stops running (handles unmount + nav cases)
  useEffect(() => {
    if (!run) {
      cleanupScrollLock();
    }
    return () => {
      cleanupScrollLock();
    };
  }, [run]);

  const handleJoyrideCallback = (data: any) => {
    const { status } = data;
    const finishedStatuses: string[] = ['finished', 'skipped'];

    if (finishedStatuses.includes(status)) {
      setRun(false);
      cleanupScrollLock();
      if (user?.id) {
        const tourKey = `tour_completed_${user.id}_${pathname}`;
        localStorage.setItem(tourKey, 'true');
      }
    }
  };

  if (!mounted || steps.length === 0 || !run) {
    return null;
  }

  const isDarkMode = theme === 'dark';

  return (
    <Joyride
      steps={steps}
      run={run}
      continuous
      scrollToFirstStep
      showProgress
      showSkipButton
      disableScrollParentFix
      callback={handleJoyrideCallback}
      styles={{
        options: {
          primaryColor: '#3b82f6', // Matches primary blue
          zIndex: 10000,
          backgroundColor: isDarkMode ? '#1e293b' : '#ffffff', // Slate-800 or white
          textColor: isDarkMode ? '#f8fafc' : '#0f172a', // Slate-50 or slate-900
          arrowColor: isDarkMode ? '#1e293b' : '#ffffff',
          overlayColor: isDarkMode ? 'rgba(0, 0, 0, 0.7)' : 'rgba(0, 0, 0, 0.4)',
        },
        tooltipContainer: {
          textAlign: 'left',
        },
        buttonNext: {
          backgroundColor: '#3b82f6',
          borderRadius: '8px',
        },
        buttonBack: {
          color: isDarkMode ? '#94a3b8' : '#64748b', // Slate-400 or slate-500
          marginRight: '0.5rem',
        },
        buttonSkip: {
          color: isDarkMode ? '#94a3b8' : '#64748b',
        }
      }}
      locale={{
        back: 'Kembali',
        close: 'Tutup',
        last: 'Selesai',
        next: 'Lanjut',
        skip: 'Lewati',
      }}
    />
  );
}
