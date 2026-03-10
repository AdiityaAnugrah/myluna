import { useSaleRequests } from '@/lib/hooks/useRequests';
import { useAuth } from '@/lib/hooks/useAuth';
import { Button } from '@/components/ui/button';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { format } from 'date-fns';
import { Check, X, Eye } from 'lucide-react';
import { useState } from 'react';
import Link from 'next/link';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { formatStatus } from '@/lib/utils/format';
import { ConfirmDialog } from '@/components/ConfirmDialog';


export function SaleApprovals() {
  const { user } = useAuth();
  const isAdmin = user?.role === 'ADMIN' || user?.role === 'SUPER_ADMIN';
  const { pendingRequests, approveRequest, rejectRequest } = useSaleRequests({ enabled: isAdmin });
  const requests = pendingRequests.data?.data || [];
  const isLoading = pendingRequests.isLoading;

  const [rejectDialogOpen, setRejectDialogOpen] = useState(false);
  const [selectedRequestId, setSelectedRequestId] = useState<string | null>(null);
  const [rejectionReason, setRejectionReason] = useState('');
  const [approveConfirmOpen, setApproveConfirmOpen] = useState(false);
  const [requestToApprove, setRequestToApprove] = useState<string | null>(null);


  const handleApprove = (id: string) => {
    setRequestToApprove(id);
    setApproveConfirmOpen(true);
  };

  const confirmApprove = () => {
    if (requestToApprove) {
      approveRequest.mutate(requestToApprove);
      setRequestToApprove(null);
    }
  };


  const openRejectDialog = (id: string) => {
    setSelectedRequestId(id);
    setRejectDialogOpen(true);
  };

  const handleReject = () => {
    if (selectedRequestId && rejectionReason) {
      rejectRequest.mutate(
        { id: selectedRequestId, reason: rejectionReason },
        {
          onSuccess: () => {
            setRejectDialogOpen(false);
            setRejectionReason('');
            setSelectedRequestId(null);
          },
        }
      );
    }
  };

  return (
    <>
      <div className="rounded-lg border bg-white">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Tanggal</TableHead>
              <TableHead>No. Penjualan</TableHead>
              <TableHead>Diajukan Oleh</TableHead>
              <TableHead>Tipe</TableHead>
              <TableHead>Alasan</TableHead>
              <TableHead className="text-right">Aksi</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow>
                <TableCell colSpan={6} className="text-center py-8 text-gray-500">
                  Memuat...
                </TableCell>
              </TableRow>
            ) : requests.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="text-center py-8 text-gray-500">
                  Tidak ada permintaan tertunda
                </TableCell>
              </TableRow>
            ) : (
              requests.map((request) => (
                <TableRow key={request.id}>
                  <TableCell className="text-sm">
                    {format(new Date(request.createdAt), 'dd MMM yyyy HH:mm')}
                  </TableCell>
                  <TableCell className="font-mono">
                    <Link href={`/sales/${request.saleId}`} className="text-blue-600 hover:underline">
                      {request.sale?.saleNumber}
                    </Link>
                  </TableCell>
                  <TableCell className="font-medium">
                    {/* @ts-ignore */}
                    {request.requester?.fullName || 'Unknown'}
                  </TableCell>
                  <TableCell>
                    <Badge variant={request.type === 'RETURN' ? 'destructive' : 'default'}>
                      {request.type === 'RETURN' ? 'RETUR' : request.type === 'EXCHANGE' ? 'TUKAR' : request.type}
                    </Badge>
                  </TableCell>
                  <TableCell className="max-w-xs truncate" title={request.reason}>
                    {request.reason}
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex items-center justify-end gap-2">
                       <Link href={`/sales/${request.saleId}`}>
                        <Button variant="ghost" size="sm" title="Lihat Penjualan">
                          <Eye className="h-4 w-4" />
                        </Button>
                      </Link>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="text-green-600 hover:text-green-700 hover:bg-green-50"
                        onClick={() => handleApprove(request.id)}
                        disabled={approveRequest.isPending}
                        title="Setujui"
                      >
                        <Check className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="text-red-600 hover:text-red-700 hover:bg-red-50"
                        onClick={() => openRejectDialog(request.id)}
                        disabled={rejectRequest.isPending}
                        title="Tolak"
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      <Dialog open={rejectDialogOpen} onOpenChange={setRejectDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Tolak Permintaan</DialogTitle>
            <DialogDescription>
              Mohon berikan alasan untuk menolak permintaan ini.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="rejectReason">Alasan Penolakan</Label>
              <Textarea
                id="rejectReason"
                value={rejectionReason}
                onChange={(e) => setRejectionReason(e.target.value)}
                placeholder="Mengapa permintaan ini ditolak?"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setRejectDialogOpen(false)}>
              Batal
            </Button>
            <Button
              variant="destructive"
              onClick={handleReject}
              disabled={!rejectionReason || rejectRequest.isPending}
            >
              {rejectRequest.isPending ? 'Menolak...' : 'Tolak Permintaan'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <ConfirmDialog
        open={approveConfirmOpen}
        onOpenChange={setApproveConfirmOpen}
        onConfirm={confirmApprove}
        title="Setujui Permintaan"
        description="Apakah Anda yakin ingin menyetujui permintaan ini?"
        confirmText="Setujui"
      />
    </>

  );
}
