import { useState } from 'react';
import { useRequestCancelSale } from '@/lib/hooks/useSales';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Loader2 } from 'lucide-react';

interface CancelSaleDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  saleId: string | null;
}

export function CancelSaleDialog({ open, onOpenChange, saleId }: CancelSaleDialogProps) {
  const [reason, setReason] = useState('');
  const cancelMutation = useRequestCancelSale();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (saleId && reason.trim()) {
      cancelMutation.mutate(
        { id: saleId, reason: reason.trim() },
        {
          onSuccess: () => {
             onOpenChange(false);
             setReason('');
          }
        }
      );
    }
  };

  const handleOpenChange = (newOpen: boolean) => {
    if (!newOpen) {
      setReason(''); // Reset on close
    }
    onOpenChange(newOpen);
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>Ajukan Pembatalan Penjualan</DialogTitle>
            <DialogDescription>
              Permintaan pembatalan ini akan dikirim ke Admin untuk disetujui. Stok barang akan dikembalikan setelah disetujui.
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="reason" className="font-semibold">Alasan Pembatalan *</Label>
              <Textarea
                id="reason"
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                placeholder="Masukkan alasan pembatalan..."
                required
                className="min-h-[100px]"
                disabled={cancelMutation.isPending}
              />
            </div>
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => handleOpenChange(false)}
              disabled={cancelMutation.isPending}
            >
              Batal
            </Button>
            <Button 
              type="submit" 
              variant="destructive"
              disabled={cancelMutation.isPending || !reason.trim()}
            >
              {cancelMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Ajukan Batal
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
