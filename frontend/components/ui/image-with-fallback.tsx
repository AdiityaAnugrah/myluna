'use client';

import { useState, useEffect, useRef } from 'react';
import { Package } from 'lucide-react';
import { cn } from '@/lib/utils';

interface ImageWithFallbackProps {
  src: string;
  webpSrc?: string;
  blurDataUrl?: string;
  alt: string;
  className?: string;
  lazy?: boolean;
  fallback?: React.ReactNode;
}

export function ImageWithFallback({
  src,
  webpSrc,
  blurDataUrl,
  alt,
  className,
  lazy = true,
  fallback,
}: ImageWithFallbackProps) {
  const [imageSrc, setImageSrc] = useState<string>(blurDataUrl || src);
  const [isLoading, setIsLoading] = useState(true);
  const [hasError, setHasError] = useState(!src);
  const imgRef = useRef<HTMLImageElement>(null);

  useEffect(() => {
    if (!src) {
        setHasError(true);
        setIsLoading(false);
        return;
    }
    
    if (!lazy || !imgRef.current) {
      loadImage();
      return;
    }

    // Lazy loading with Intersection Observer
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            loadImage();
            observer.disconnect();
          }
        });
      },
      { rootMargin: '50px' }
    );

    observer.observe(imgRef.current);

    return () => observer.disconnect();
  }, [lazy, webpSrc, src]);

  const loadImage = () => {
    const img = new Image();
    
    // Try WebP first if available
    const sourceToTry = webpSrc || src;
    
    img.onload = () => {
      setImageSrc(sourceToTry);
      setIsLoading(false);
      setHasError(false);
    };

    img.onerror = () => {
      // If WebP fails, try original
      if (webpSrc && sourceToTry === webpSrc) {
        const fallbackImg = new Image();
        fallbackImg.onload = () => {
          setImageSrc(src);
          setIsLoading(false);
          setHasError(false);
        };
        fallbackImg.onerror = () => {
          setHasError(true);
          setIsLoading(false);
        };
        fallbackImg.src = src;
      } else {
        setHasError(true);
        setIsLoading(false);
      }
    };

    img.src = sourceToTry;
  };

  if (hasError) {
    if (fallback) return <>{fallback}</>;
    return (
      <div className={cn('flex items-center justify-center bg-muted/50', className)}>
        <Package className="h-1/2 w-1/2 text-muted-foreground/30" />
      </div>
    );
  }

  return (
    <img
      ref={imgRef}
      src={imageSrc}
      alt={alt}
      className={cn(
        'transition-opacity duration-300',
        isLoading && blurDataUrl ? 'blur-sm scale-105' : 'blur-0 scale-100',
        className
      )}
      style={{
        opacity: isLoading && blurDataUrl ? 0.7 : 1,
      }}
    />
  );
}
