'use client';

import { useState } from 'react';
import { useHotkeys } from 'react-hotkeys-hook';
import { useRouter } from 'next/navigation';

export function useKeyboardShortcuts() {
  const router = useRouter();
  const [showHelp, setShowHelp] = useState(false);

  // Ctrl+N or Cmd+N - New Transaction
  useHotkeys('ctrl+n, cmd+n', (e) => {
    e.preventDefault();
    router.push('/sales/new');
  }, { enableOnFormTags: false });

  // Ctrl+P or Cmd+P - Products
  useHotkeys('ctrl+p, cmd+p', (e) => {
    e.preventDefault();
    router.push('/products');
  }, { enableOnFormTags: false });

  // Ctrl+K or Cmd+K - Search (focus search input)
  useHotkeys('ctrl+k, cmd+k', (e) => {
    e.preventDefault();
    const searchInput = document.querySelector('input[type="search"]') as HTMLInputElement;
    searchInput?.focus();
  }, { enableOnFormTags: false });

  // Ctrl+S or Cmd+S - Save (for forms)
  useHotkeys('ctrl+s, cmd+s', (e) => {
    e.preventDefault();
    const submitButton = document.querySelector('button[type="submit"]') as HTMLButtonElement;
    submitButton?.click();
  }, { enableOnFormTags: ['INPUT', 'TEXTAREA', 'SELECT'] });

  // Escape - Close modals/dialogs
  useHotkeys('esc', () => {
    // Find and click close button in any open dialog
    const closeButton = document.querySelector('[role="dialog"] button[aria-label*="lose"]') as HTMLButtonElement;
    closeButton?.click();
  });

  // G+D - Go to Dashboard
  useHotkeys('g+d', () => {
    router.push('/');
  }, { enableOnFormTags: false });

  // G+S - Go to Sales
  useHotkeys('g+s', () => {
    router.push('/sales');
  }, { enableOnFormTags: false });

  // G+P - Go to Products
  useHotkeys('g+p', () => {
    router.push('/products');
  }, { enableOnFormTags: false });

  // ? - Show keyboard shortcuts help
  useHotkeys('shift+/', (e) => {
    e.preventDefault();
    setShowHelp(true);
  }, { enableOnFormTags: false });

  return { showHelp, setShowHelp };
}

// Keyboard shortcuts list for help modal
export const KEYBOARD_SHORTCUTS = [
  {
    category: 'Navigation',
    shortcuts: [
      { keys: ['Ctrl', 'N'], description: 'Transaksi Baru' },
      { keys: ['Ctrl', 'P'], description: 'Daftar Produk' },
      { keys: ['Ctrl', 'K'], description: 'Fokus Pencarian' },
      { keys: ['G', 'D'], description: 'Ke Dashboard' },
      { keys: ['G', 'S'], description: 'Ke Penjualan' },
      { keys: ['G', 'P'], description: 'Ke Produk' },
    ],
  },
  {
    category: 'Actions',
    shortcuts: [
      { keys: ['Ctrl', 'S'], description: 'Simpan Form' },
      { keys: ['Esc'], description: 'Tutup Dialog' },
      { keys: ['/'], description: 'Cari' },
    ],
  },
  {
    category: 'Help',
    shortcuts: [
      { keys: ['?'], description: 'Tampilkan Shortcuts' },
    ],
  },
];
