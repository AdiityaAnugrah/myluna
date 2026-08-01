import { ComplaintStatus, ReturnTicketStatus, SaleReturnStatus } from '@/types';

export function getComplaintStatusLabel(status: ComplaintStatus) {
  switch (status) {
    case 'PENDING_TCP_REVIEW':
      return 'Menunggu Review PUSAT';
    case 'REJECTED_BY_TCP':
      return 'Ditolak PUSAT';
    case 'ACCEPTED_BY_TCP':
      return 'Sedang Ditangani PUSAT';
    case 'REPLACEMENT_SHIPPED':
      return 'Pengganti Sudah Dikirim';
    case 'WAITING_USER_CONFIRMATION':
      return 'Menunggu Konfirmasi User';
    case 'WAITING_USER_DELIVERY_CONFIRMATION':
      return 'Menunggu Konfirmasi Barang Sampai';
    case 'MONITORING_CUSTOMER_CONFIRMATION':
      return 'Masa Konfirmasi Pelanggan';
    case 'FOLLOW_UP_REQUIRED':
      return 'Perlu Tindak Lanjut';
    case 'COMPLETED':
      return 'Selesai';
    case 'CONVERTED_TO_RETURN':
      return 'Dialihkan ke Retur';
    default:
      return status;
  }
}

export function getComplaintStatusBadgeClass(status: ComplaintStatus) {
  switch (status) {
    case 'PENDING_TCP_REVIEW':
      return 'bg-amber-100 text-amber-800 border-amber-300';
    case 'REJECTED_BY_TCP':
      return 'bg-red-100 text-red-800 border-red-300';
    case 'ACCEPTED_BY_TCP':
      return 'bg-blue-100 text-blue-800 border-blue-300';
    case 'REPLACEMENT_SHIPPED':
      return 'bg-green-100 text-green-800 border-green-300';
    case 'WAITING_USER_CONFIRMATION':
      return 'bg-cyan-100 text-cyan-800 border-cyan-300';
    case 'WAITING_USER_DELIVERY_CONFIRMATION':
      return 'bg-sky-100 text-sky-800 border-sky-300';
    case 'MONITORING_CUSTOMER_CONFIRMATION':
      return 'bg-purple-100 text-purple-800 border-purple-300';
    case 'FOLLOW_UP_REQUIRED':
      return 'bg-orange-100 text-orange-800 border-orange-300';
    case 'COMPLETED':
      return 'bg-emerald-100 text-emerald-800 border-emerald-300';
    case 'CONVERTED_TO_RETURN':
      return 'bg-violet-100 text-violet-800 border-violet-300';
    default:
      return '';
  }
}

export function getSaleReturnStatusLabel(status: SaleReturnStatus) {
  switch (status) {
    case 'PENDING_REVIEW':
      return 'Menunggu Review';
    case 'WAITING_ITEM_RETURN':
      return 'Menunggu Barang Kembali';
    case 'ITEM_RECEIVED':
      return 'Barang Sudah Diterima';
    case 'REJECTED':
      return 'Ditolak';
    case 'RESTOCKED':
      return 'Masuk Stok';
    case 'DAMAGED':
      return 'Tidak Layak Pakai';
    case 'RESENT':
      return 'Barang Pengganti Dikirim';
    case 'COMPLETED':
      return 'Selesai';
    default:
      return status;
  }
}

export function getSaleReturnStatusBadgeClass(status: SaleReturnStatus) {
  switch (status) {
    case 'PENDING_REVIEW':
      return 'bg-amber-100 text-amber-800 border-amber-300';
    case 'WAITING_ITEM_RETURN':
      return 'bg-blue-100 text-blue-800 border-blue-300';
    case 'ITEM_RECEIVED':
      return 'bg-violet-100 text-violet-800 border-violet-300';
    case 'REJECTED':
      return 'bg-red-100 text-red-800 border-red-300';
    case 'RESTOCKED':
      return 'bg-green-100 text-green-800 border-green-300';
    case 'DAMAGED':
      return 'bg-orange-100 text-orange-800 border-orange-300';
    case 'RESENT':
      return 'bg-cyan-100 text-cyan-800 border-cyan-300';
    case 'COMPLETED':
      return 'bg-slate-100 text-slate-800 border-slate-300';
    default:
      return '';
  }
}

export function getReturnTicketStatusLabel(status: ReturnTicketStatus, options?: { overdue?: boolean }) {
  if (options?.overdue) return 'Melewati Deadline';

  switch (status) {
    case 'OPEN':
      return 'Baru Dibuka';
    case 'IN_DISCUSSION':
      return 'Dalam Diskusi';
    case 'DECISION_FINALIZED':
      return 'Keputusan Sudah Final';
    case 'WAITING_TCP_EXECUTION':
      return 'Menunggu Eksekusi PUSAT';
    case 'TCP_EXECUTING':
      return 'Sedang Dieksekusi PUSAT';
    case 'COMPLETED':
      return 'Selesai';
    case 'REJECTED':
      return 'Ditolak';
    case 'OVERDUE':
      return 'Melewati Deadline';
    default:
      return status;
  }
}

export function getReturnTicketStatusBadgeClass(status: ReturnTicketStatus) {
  switch (status) {
    case 'OPEN':
      return 'bg-slate-100 text-slate-800 border-slate-300';
    case 'IN_DISCUSSION':
      return 'bg-blue-100 text-blue-800 border-blue-300';
    case 'DECISION_FINALIZED':
      return 'bg-violet-100 text-violet-800 border-violet-300';
    case 'WAITING_TCP_EXECUTION':
      return 'bg-amber-100 text-amber-800 border-amber-300';
    case 'TCP_EXECUTING':
      return 'bg-cyan-100 text-cyan-800 border-cyan-300';
    case 'COMPLETED':
      return 'bg-green-100 text-green-800 border-green-300';
    case 'REJECTED':
      return 'bg-red-100 text-red-800 border-red-300';
    case 'OVERDUE':
      return 'bg-orange-100 text-orange-800 border-orange-300';
    default:
      return 'bg-muted text-muted-foreground';
  }
}
