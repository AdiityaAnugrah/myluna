'use client';

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { useDailyAuditStats } from '@/lib/hooks/useAudit';
import { format, differenceInSeconds } from 'date-fns';
import { id } from 'date-fns/locale';
import { Loader2, Clock, Calendar, Activity } from 'lucide-react';
import { Badge } from '@/components/ui/badge';

interface UserActivityModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  userId?: string;
  userName?: string;
}

function formatDuration(start: string, end: string) {
  const diff = differenceInSeconds(new Date(end), new Date(start));
  if (diff < 60) return `${diff}d`;
  const h = Math.floor(diff / 3600);
  const m = Math.floor((diff % 3600) / 60);
  return `${h}j ${m}m`;
}

export function UserActivityModal({ open, onOpenChange, userId, userName }: UserActivityModalProps) {
  const { data, isLoading } = useDailyAuditStats({ userId });
  const stats = data?.data || [];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[85vh] overflow-hidden flex flex-col p-0">
        <DialogHeader className="p-6 pb-2">
          <DialogTitle className="flex items-center gap-2 text-xl">
             <Activity className="h-5 w-5 text-primary" />
             Riwayat Aktivitas Harian: <span className="text-primary">{userName}</span>
          </DialogTitle>
          <p className="text-sm text-muted-foreground">
            Menampilkan ringkasan jam aktif pengguna per hari berdasarkan aktivitas sistem.
          </p>
        </DialogHeader>

        <div className="flex-1 overflow-auto p-6 pt-2">
          {isLoading ? (
            <div className="py-20 text-center">
              <Loader2 className="h-8 w-8 animate-spin mx-auto text-primary" />
              <p className="text-sm text-muted-foreground mt-2">Memuat data aktivitas...</p>
            </div>
          ) : stats.length === 0 ? (
            <div className="py-20 text-center border-2 border-dashed rounded-xl bg-muted/30">
              <Calendar className="h-10 w-10 mx-auto opacity-20 mb-2" />
              <p className="text-muted-foreground">Belum ada data aktivitas untuk pengguna ini</p>
            </div>
          ) : (
            <div className="border rounded-xl bg-card overflow-hidden">
              <Table>
                <TableHeader className="bg-muted/50">
                  <TableRow>
                    <TableHead className="w-[150px]">Tanggal</TableHead>
                    <TableHead>Mulai</TableHead>
                    <TableHead>Terakhir Aktif</TableHead>
                    <TableHead className="text-right">Durasi Total</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {stats.map((stat, idx) => (
                    <TableRow key={idx} className="hover:bg-muted/30 transition-colors">
                      <TableCell className="font-medium">
                        {format(new Date(stat.date), 'dd MMM yyyy', { locale: id })}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1.5 text-xs text-green-600 font-medium">
                          <Clock className="h-3 w-3" />
                          {format(new Date(stat.startTime), 'HH:mm:ss')}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1.5 text-xs text-amber-600 font-medium">
                          <Activity className="h-3 w-3" />
                          {format(new Date(stat.endTime), 'HH:mm:ss')}
                        </div>
                      </TableCell>
                      <TableCell className="text-right">
                        <Badge variant="outline" className="font-mono bg-primary/5 border-primary/20">
                          {formatDuration(stat.startTime, stat.endTime)}
                        </Badge>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </div>
        
        <div className="p-6 pt-2 border-t bg-muted/20 text-[10px] text-muted-foreground italic">
          * Durasi dihitung dari selisih waktu aktivitas pertama dan terakhir di hari yang sama.
        </div>
      </DialogContent>
    </Dialog>
  );
}
