import { Sale, SaleStatus } from '@/types';
import { differenceInDays } from 'date-fns';

/**
 * Format a number or string value to Indonesian Rupiah currency format
 */
export const formatCurrency = (value: string | number): string => {
  const numValue = typeof value === 'string' ? parseFloat(value) : value;
  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    minimumFractionDigits: 0,
  }).format(numValue);
};

/**
 * Get the full URL for a PDF document
 */
export const getPdfUrl = (filename: string): string => {
  const baseUrl = process.env.NEXT_PUBLIC_API_URL?.replace('/api/v1', '') || 'http://localhost:4000';
  return `${baseUrl}/uploads/documents/${filename}`;
};

/**
 * Calculate days since a sale was created
 */
export const getDaysSinceSale = (saleDate: string): number => {
  return differenceInDays(new Date(), new Date(saleDate));
};

/**
 * Check if a sale is urgent (>= 3 days old and not yet processed)
 * Updated threshold from 1 day to 3 days for more realistic urgency
 */
export const isUrgentSale = (sale: Sale): boolean => {
  const days = getDaysSinceSale(sale.saleDate);
  return days >= 3;
};

/**
 * Parse variant data which can be an array, JSON string, or other format
 */
export const getVariants = (variantList: any): string[] => {
  if (Array.isArray(variantList)) return variantList;
  if (typeof variantList === 'string') {
    try {
      const parsed = JSON.parse(variantList);
      if (Array.isArray(parsed)) return parsed;
    } catch {
      return [];
    }
  }
  return [];
};

/**
 * Check if a date string is today
 */
export const isToday = (dateString: string | null | undefined): boolean => {
  if (!dateString) return false;
  const date = new Date(dateString);
  const today = new Date();
  return (
    date.getDate() === today.getDate() &&
    date.getMonth() === today.getMonth() &&
    date.getFullYear() === today.getFullYear()
  );
};
