import React from 'react';
import { Button } from '@/components/ui/button';
import { Trash2, X, Check } from 'lucide-react';
import { Card } from '@/components/ui/card';

interface BulkActionBarProps {
  selectedCount: number;
  onDelete?: () => void;
  onActivate?: () => void;
  onDeactivate?: () => void;
  onCancel: () => void;
  isLoading?: boolean;
}

export function BulkActionBar({
  selectedCount,
  onDelete,
  onActivate,
  onDeactivate,
  onCancel,
  isLoading = false,
}: BulkActionBarProps) {
  if (selectedCount === 0) return null;

  return (
    <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 animate-in slide-in-from-bottom-10">
      <Card className="px-6 py-4 shadow-2xl border-2">
        <div className="flex items-center gap-4">
          <span className="text-sm font-medium">
            {selectedCount} item dipilih
          </span>
          <div className="h-6 w-px bg-border" />
          <div className="flex gap-2">
            {onActivate && (
              <Button
                size="sm"
                variant="outline"
                onClick={onActivate}
                disabled={isLoading}
              >
                <Check className="mr-2 h-4 w-4" />
                Aktifkan
              </Button>
            )}
            {onDeactivate && (
              <Button
                size="sm"
                variant="outline"
                onClick={onDeactivate}
                disabled={isLoading}
              >
                <X className="mr-2 h-4 w-4" />
                Nonaktifkan
              </Button>
            )}
            {onDelete && (
              <Button
                size="sm"
                variant="destructive"
                onClick={onDelete}
                disabled={isLoading}
              >
                <Trash2 className="mr-2 h-4 w-4" />
                Hapus
              </Button>
            )}
          </div>
          <div className="h-6 w-px bg-border" />
          <Button
            size="sm"
            variant="ghost"
            onClick={onCancel}
            disabled={isLoading}
          >
            Batal
          </Button>
        </div>
      </Card>
    </div>
  );
}
