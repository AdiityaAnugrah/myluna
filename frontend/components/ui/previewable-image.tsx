'use client';

import { useState } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { ImageWithFallback } from '@/components/ui/image-with-fallback';
import { cn } from '@/lib/utils';
import { getImageUrl } from '@/lib/utils/url';

interface PreviewableImageProps {
  src: string | null | undefined;
  alt: string;
  className?: string;
  imageClassName?: string;
  fullSrc?: string | null;
  disabled?: boolean;
}

export function PreviewableImage({
  src,
  alt,
  className,
  imageClassName,
  fullSrc,
  disabled,
}: PreviewableImageProps) {
  const [open, setOpen] = useState(false);
  const thumbnailUrl = getImageUrl(src);
  const previewUrl = getImageUrl(fullSrc || src);
  const canPreview = !!previewUrl && !disabled;

  return (
    <>
      <button
        type="button"
        disabled={!canPreview}
        onClick={() => setOpen(true)}
        className={cn(
          'overflow-hidden rounded-md border bg-muted text-left transition hover:ring-2 hover:ring-primary disabled:cursor-default disabled:hover:ring-0',
          className
        )}
        title={canPreview ? 'Klik untuk lihat foto penuh' : 'Tidak ada foto'}
      >
        <ImageWithFallback src={thumbnailUrl} alt={alt} className={cn('h-full w-full object-cover', imageClassName)} />
      </button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="border-0 bg-transparent p-0 shadow-none sm:max-w-6xl" showCloseButton={false}>
          <DialogTitle className="sr-only">Preview foto</DialogTitle>
          <DialogDescription className="sr-only">Foto tampil penuh dengan background gelap.</DialogDescription>
          <button
            type="button"
            onClick={() => setOpen(false)}
            className="fixed inset-0 z-[-1] bg-black/90"
            aria-label="Tutup preview foto"
          />
          <div className="relative flex max-h-[92vh] items-center justify-center rounded-xl bg-black/20 p-3">
            {previewUrl && (
              <img
                src={previewUrl}
                alt={alt}
                className="max-h-[88vh] max-w-full rounded-lg object-contain shadow-2xl"
              />
            )}
            <Button type="button" variant="secondary" size="sm" className="absolute right-4 top-4" onClick={() => setOpen(false)}>
              Tutup
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
