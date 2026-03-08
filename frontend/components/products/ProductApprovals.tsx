import { useProductRequests, useChangeRequests } from '@/lib/hooks/useRequests';
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
import { Check, X } from 'lucide-react';
import { useState } from 'react';
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


export function ProductApprovals() {
  const { pendingRequests, approveRequest, rejectRequest } = useProductRequests();
  const requests = pendingRequests.data?.data || [];
  
  const { pendingRequests: changeQuery, approveRequest: approveChange, rejectRequest: rejectChange } = useChangeRequests();
  const changeRequestsRaw = changeQuery.data?.data || [];
  const productChangeRequests = changeRequestsRaw.filter(r => r.entityType === 'PRODUCT');

  const isLoading = pendingRequests.isLoading || changeQuery.isLoading;

  const [rejectDialogOpen, setRejectDialogOpen] = useState(false);
  const [selectedRequestId, setSelectedRequestId] = useState<string | null>(null);
  const [rejectType, setRejectType] = useState<'status' | 'change'>('status');
  const [rejectionReason, setRejectionReason] = useState('');
  
  const [approveConfirmOpen, setApproveConfirmOpen] = useState(false);
  const [requestToApprove, setRequestToApprove] = useState<{ id: string, type: 'status' | 'change' } | null>(null);


  const handleApprove = (id: string, type: 'status' | 'change') => {
    setRequestToApprove({ id, type });
    setApproveConfirmOpen(true);
  };

  const confirmApprove = () => {
    if (requestToApprove) {
      if (requestToApprove.type === 'status') {
        approveRequest.mutate(requestToApprove.id);
      } else {
        approveChange.mutate(requestToApprove.id);
      }
      setRequestToApprove(null);
    }
  };


  const openRejectDialog = (id: string, type: 'status' | 'change') => {
    setSelectedRequestId(id);
    setRejectType(type);
    setRejectDialogOpen(true);
  };

  const handleReject = () => {
    if (selectedRequestId && rejectionReason) {
      const mutation = rejectType === 'status' ? rejectRequest : rejectChange;
      mutation.mutate(
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
              <TableHead>Diajukan Oleh</TableHead>
              <TableHead>Produk</TableHead>
              <TableHead>Permintaan</TableHead>
              <TableHead>Alasan</TableHead>
              <TableHead className="text-right">Aksi</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow>
                <TableCell colSpan={6} className="text-center py-8 text-gray-500">
                  <div className="flex flex-col items-center gap-2">
                    <span className="loading loading-spinner loading-md text-primary"></span>
                    <p>Memuat permintaan...</p>
                  </div>
                </TableCell>
              </TableRow>
            ) : (
              <>
                {requests.length === 0 && productChangeRequests.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center py-12 text-gray-500">
                      <div className="flex flex-col items-center gap-2 opacity-40">
                        <Check className="h-12 w-12" />
                        <p>Semua permintaan telah diproses</p>
                      </div>
                    </TableCell>
                  </TableRow>
                )}

                {/* Change Requests (Product Create/Update) */}
                {productChangeRequests.map((request) => {
                    const payload = typeof request.payload === 'string' ? JSON.parse(request.payload) : request.payload;
                    return (
                      <TableRow key={request.id} className="bg-blue-50/10">
                        <TableCell className="text-sm">
                          {format(new Date(request.createdAt), 'dd MMM yyyy HH:mm')}
                        </TableCell>
                        <TableCell className="font-medium">
                          {request.requester?.fullName || request.requester?.username || 'Unknown'}
                        </TableCell>
                        <TableCell>
                          <div className="flex flex-col">
                            <span className="font-semibold">{payload.name || 'Produk Baru'}</span>
                            <span className="text-xs text-muted-foreground">{payload.sku || '-'}</span>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <Badge variant={request.requestType === 'CREATE' ? 'info' : 'outline'}>
                              {request.requestType === 'CREATE' ? 'PRODUK BARU' : 'UPDATE DATA'}
                            </Badge>
                          </div>
                        </TableCell>
                        <TableCell className="max-w-xs truncate italic text-muted-foreground">
                          -
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex items-center justify-end gap-2">
                            <Button
                              variant="ghost"
                              size="sm"
                              className="text-green-600 hover:text-green-700 hover:bg-green-50"
                              onClick={() => handleApprove(request.id, 'change')}
                              disabled={approveChange.isPending}
                            >
                              <Check className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="text-red-600 hover:text-red-700 hover:bg-red-50"
                              onClick={() => openRejectDialog(request.id, 'change')}
                              disabled={rejectChange.isPending}
                            >
                              <X className="h-4 w-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                })}

                {/* Status Change Requests */}
                {requests.map((request) => (
                  <TableRow key={request.id}>
                    <TableCell className="text-sm">
                      {format(new Date(request.createdAt), 'dd MMM yyyy HH:mm')}
                    </TableCell>
                    <TableCell className="font-medium">
                      {/* @ts-ignore - requester is included in response */}
                      {request.requester?.fullName || 'Unknown'}
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-col">
                        <span>{request.product?.name}</span>
                        <span className="text-xs text-muted-foreground">{request.product?.sku}</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Badge variant="outline" className="border-primary/50 text-primary">
                          {request.requestedStatus === 'ACTIVE' ? 'AKTIVASI' : 'PASIFAKSI'}
                        </Badge>
                      </div>
                    </TableCell>
                    <TableCell className="max-w-xs truncate" title={request.reason}>
                      {request.reason}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          className="text-green-600 hover:text-green-700 hover:bg-green-50"
                          onClick={() => handleApprove(request.id, 'status')}
                          disabled={approveRequest.isPending}
                        >
                          <Check className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="text-red-600 hover:text-red-700 hover:bg-red-50"
                          onClick={() => openRejectDialog(request.id, 'status')}
                          disabled={rejectRequest.isPending}
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </>
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
