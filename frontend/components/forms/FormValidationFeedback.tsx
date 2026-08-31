'use client';

import { AlertTriangle } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { cn } from '@/lib/utils';

interface FormValidationSummaryProps {
  show: boolean;
  fields: string[];
  title?: string;
  className?: string;
}

export function FormValidationSummary({
  show,
  fields,
  title = 'Form belum lengkap',
  className,
}: FormValidationSummaryProps) {
  if (!show || fields.length === 0) return null;

  return (
    <Alert variant="destructive" className={cn('border-destructive/60 bg-destructive/5', className)}>
      <AlertTriangle className="h-4 w-4" />
      <AlertTitle>{title}</AlertTitle>
      <AlertDescription>
        <p className="mb-2">Lengkapi bagian berikut sebelum menyimpan:</p>
        <div className="flex flex-wrap gap-2">
          {fields.map((field) => (
            <span
              key={field}
              className="rounded-full border border-destructive/30 bg-background px-2 py-1 text-xs font-medium"
            >
              {field}
            </span>
          ))}
        </div>
      </AlertDescription>
    </Alert>
  );
}

export function FormFieldError({ message }: { message?: string }) {
  if (!message) return null;
  return (
    <p className="text-xs font-medium text-destructive" role="alert">
      {message}
    </p>
  );
}

export const errorInputClass = 'border-destructive focus-visible:ring-destructive';
export const errorSelectClass = 'border-destructive focus:ring-destructive';
