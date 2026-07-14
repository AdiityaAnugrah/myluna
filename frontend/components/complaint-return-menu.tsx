'use client';

import Link from 'next/link';
import { FileText, MessageSquareWarning } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { cn } from '@/lib/utils';

type ActiveMenu = 'complaints' | 'returns';

export function ComplaintReturnMenu({ active }: { active: ActiveMenu }) {
  const menus = [
    {
      key: 'complaints' as const,
      title: 'Komplen',
      desc: 'Review, keputusan, kirim komponen, potongan, atau jadikan retur.',
      href: '/complaints',
      icon: MessageSquareWarning,
    },
    {
      key: 'returns' as const,
      title: 'Retur',
      desc: 'Review retur, terima barang, inspeksi, restock, hangus, atau revisi.',
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
