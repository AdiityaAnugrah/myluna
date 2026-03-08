export const formatStatus = (status: string) => {
  const map: Record<string, string> = {
    PENDING: 'MENUNGGU',
    APPROVED: 'DISETUJUI',
    PROCESSED: 'DIPROSES',
    SETTLED: 'LUNAS',
    REJECTED: 'DITOLAK',
    COMPLETED: 'SELESAI',
    CANCELLED: 'DIBATALKAN',
    ACTIVE: 'AKTIF',
    PASSIVE: 'PASIF',
    IN: 'MASUK',
    OUT: 'KELUAR',
    ADJUSTMENT: 'PENYESUAIAN',
    CASH: 'TUNAI',
    TRANSFER: 'TRANSFER',
    CREDIT: 'KREDIT',
    OFFLINE_STORE: 'TOKO OFFLINE',
    TOKOPEDIA: 'TOKOPEDIA',
    SHOPEE: 'SHOPEE',
    TIKTOK_SHOP: 'TIKTOK SHOP',
    LAZADA: 'LAZADA',
    OTHER: 'LAINNYA',
  };
  return map[status] || status;
};

export const formatCurrency = (amount: number | string) => {
  const value = typeof amount === 'string' ? parseFloat(amount) : amount;
  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value);
};

export const formatRole = (role: string) => {
  const map: Record<string, string> = {
    SUPER_ADMIN: 'Super Admin',
    ADMIN: 'Administrator',
    USER: 'Pengguna',
    CASHIER: 'Kasir',
    TCP: 'Tim Cek Pesanan',
  };
  return map[role] || role;
};
