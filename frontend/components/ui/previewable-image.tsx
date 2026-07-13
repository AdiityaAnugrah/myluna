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
        <DialogContent
          className="!fixed !inset-0 !left-0 !top-0 !z-50 !h-screen !max-h-screen !w-screen !max-w-none !translate-x-0 !translate-y-0 !rounded-none !border-0 !bg-black/95 !p-0 !shadow-none sm:!max-w-none"
          showCloseButton={false}
        >
          <DialogTitle className="sr-only">Preview foto</DialogTitle>
          <DialogDescription className="sr-only">Foto tampil layar penuh dengan background gelap.</DialogDescription>
          <button
            type="button"
            onClick={() => setOpen(false)}
            className="absolute inset-0 z-0 bg-black/95"
            aria-label="Tutup preview foto"
          />
          <div className="pointer-events-none relative z-10 flex h-screen w-screen items-center justify-center p-4 md:p-8">
            {previewUrl && (
              <img
                src={previewUrl}
                alt={alt}
                className="pointer-events-auto max-h-[92vh] max-w-[96vw] rounded-lg object-contain shadow-2xl"
              />
            )}
            <Button
              type="button"
              variant="secondary"
              size="sm"
              className="pointer-events-auto fixed right-4 top-4 z-20"
              onClick={() => setOpen(false)}
            >
              Tutup
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
