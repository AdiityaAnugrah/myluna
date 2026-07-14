'use client';

import Link from 'next/link';
import { FileText, MessageSquareWarning } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { cn } from '@/lib/utils';

type ActiveMenu = 'complaints' | 'returns';
type MenuRole = 'USER' | 'TCP' | 'ADMIN' | 'SUPER_ADMIN' | string | undefined;

export function ComplaintReturnMenu({ active, role }: { active: ActiveMenu; role?: MenuRole }) {
  const isUser = role === 'USER';
  const isTcp = role === 'TCP';
  const menus = [
    {
      key: 'complaints' as const,
      title: isUser ? 'Komplen Saya' : isTcp ? 'Tugas Komplen' : 'Komplen',
      desc: isUser
        ? 'Buat dan pantau komplen pesanan Anda.'
        : isTcp
          ? 'Review dan proses keputusan komplen dari user.'
          : 'Review, keputusan, kirim komponen, potongan, atau jadikan retur.',
      href: '/complaints',
      icon: MessageSquareWarning,
    },
    {
      key: 'returns' as const,
      title: isUser ? 'Retur Saya' : isTcp ? 'Tugas Retur' : 'Retur',
      desc: isUser
        ? 'Buat dan pantau pengajuan retur Anda.'
        : isTcp
          ? 'Terima barang retur, inspeksi, dan proses hasilnya.'
          : 'Review retur, terima barang, inspeksi, restock, hangus, atau revisi.',
      href: '/returns',
      icon: FileText,
    },
  ];

  return (
    <Card className="border-dashed bg-muted/20">
      <CardContent className="grid gap-2 p-3 md:grid-cols-2">
        {menus.map((menu) => {
          const Icon = menu.icon;
          const isActive = active === menu.key;
          return (
            <Link
              key={menu.key}
              href={menu.href}
              className={cn(
                'rounded-lg border p-4 transition-colors hover:bg-background',
                isActive ? 'border-primary bg-primary/10 text-primary' : 'bg-background/60'
              )}
            >
              <div className="flex items-start gap-3">
                <div className={cn('rounded-lg p-2', isActive ? 'bg-primary text-primary-foreground' : 'bg-muted')}>
                  <Icon className="h-5 w-5" />
                </div>
                <div>
                  <div className="font-semibold">{menu.title}</div>
                  <div className={cn('mt-1 text-xs', isActive ? 'text-primary/80' : 'text-muted-foreground')}>
                    {menu.desc}
                  </div>
                </div>
              </div>
            </Link>
          );
        })}
      </CardContent>
    </Card>
  );
}
