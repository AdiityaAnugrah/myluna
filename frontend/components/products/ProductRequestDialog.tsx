import { useState } from 'react';
import { useProductRequests } from '@/lib/hooks/useRequests';
import { Product } from '@/types';
import { Button } from '@/components/ui/button';
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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

interface ProductRequestDialogProps {
  product: Product;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function ProductRequestDialog({
  product,
  open,
  onOpenChange,
}: ProductRequestDialogProps) {
  const [reason, setReason] = useState('');
  const { createRequest } = useProductRequests();
  const [requestedStatus, setRequestedStatus] = useState<'ACTIVE' | 'PASSIVE'>(
    product.isActive ? 'PASSIVE' : 'ACTIVE'
  );

  const handleSubmit = () => {
    if (!reason) return;

    createRequest.mutate(
      {
        productId: product.id,
        requestedStatus,
        reason,
      },
      {
        onSuccess: () => {
          setReason('');
          onOpenChange(false);
        },
      }
    );
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Ajukan Perubahan Status</DialogTitle>
          <DialogDescription>
            Ajukan permintaan untuk mengubah status produk {product.name} ({product.sku}).
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          <div className="grid gap-2">
            <Label>Status yang Diminta</Label>
            <div className="flex items-center space-x-2">
              <span className="font-semibold">
                {product.isActive ? 'Aktif' : 'Pasif'}
              </span>
              <span>→</span>
              <span className="font-semibold text-blue-600">
                {product.isActive ? 'Pasif' : 'Aktif'}
              </span>
            </div>
          </div>
          <div className="grid gap-2">
            <Label htmlFor="reason">Alasan</Label>
            <Textarea
              id="reason"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="Mengapa perubahan status ini diperlukan?"
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Batal
          </Button>
          <Button onClick={handleSubmit} disabled={!reason || createRequest.isPending}>
            {createRequest.isPending ? 'Mengirim...' : 'Kirim Permintaan'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
