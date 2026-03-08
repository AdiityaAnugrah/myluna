import { useState } from 'react';
import { useSaleRequests } from '@/lib/hooks/useRequests';
import { Sale } from '@/types';
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

interface SaleRequestDialogProps {
  sale: Sale;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function SaleRequestDialog({
  sale,
  open,
  onOpenChange,
}: SaleRequestDialogProps) {
  const [reason, setReason] = useState('');
  const { createRequest } = useSaleRequests();
  const [type, setType] = useState<'RETURN' | 'EXCHANGE'>('RETURN');

  const handleSubmit = () => {
    if (!reason) return;

    createRequest.mutate(
      {
        saleId: sale.id,
        type,
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
          <DialogTitle>Ajukan Retur / Tukar</DialogTitle>
          <DialogDescription>
            Ajukan permintaan untuk Penjualan #{sale.saleNumber}.
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          <div className="grid gap-2">
            <Label>Tipe Permintaan</Label>
            <Select value={type} onValueChange={(val: any) => setType(val)}>
              <SelectTrigger>
                <SelectValue placeholder="Pilih tipe" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="RETURN">Retur (Pengembalian)</SelectItem>
                <SelectItem value="EXCHANGE">Tukar (Penukaran)</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="grid gap-2">
            <Label htmlFor="reason">Alasan</Label>
            <Textarea
              id="reason"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="Mengapa retur/tukar ini diajukan?"
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
