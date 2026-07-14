'use client';

import { usePathname } from 'next/navigation';
import { Badge } from '@/components/ui/badge';
import { useFeatureByPath } from '@/lib/hooks/useFeatures';
import { AlertTriangle } from 'lucide-react';

export function FeatureDevelopmentBanner() {
  const pathname = usePathname();
  const { feature } = useFeatureByPath(pathname);

  if (!feature?.isDevelopment) return null;

  return (
    <div className="border-b border-amber-200 bg-amber-50 px-4 py-2 text-amber-950">
      <div className="flex flex-wrap items-center gap-2 text-xs font-medium">
        <AlertTriangle className="h-4 w-4 text-amber-600" />
        <Badge variant="outline" className="border-amber-300 bg-white text-amber-800">
          Masa Pengembangan
        </Badge>
        <span>
          Fitur <strong>{feature.label}</strong> masih dalam masa pengembangan. Gunakan sesuai arahan tim.
        </span>
      </div>
    </div>
  );
}
