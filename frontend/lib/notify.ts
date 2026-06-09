import { toast } from 'sonner';
import { AlertTriangle, CheckCircle2, Info, Loader2, XCircle } from 'lucide-react';
import { createElement } from 'react';

type NotifyOptions = {
  description?: string;
  duration?: number;
};

const defaultDuration = 4500;

export const notify = {
  success: (title: string, options?: NotifyOptions) =>
    toast.success(title, {
      description: options?.description,
      duration: options?.duration ?? defaultDuration,
      icon: createElement(CheckCircle2, { className: 'h-4 w-4' }),
    }),

  error: (title: string, options?: NotifyOptions) =>
    toast.error(title, {
      description: options?.description,
      duration: options?.duration ?? 5500,
      icon: createElement(XCircle, { className: 'h-4 w-4' }),
    }),

  warning: (title: string, options?: NotifyOptions) =>
    toast.warning(title, {
      description: options?.description,
      duration: options?.duration ?? 5000,
      icon: createElement(AlertTriangle, { className: 'h-4 w-4' }),
    }),

  info: (title: string, options?: NotifyOptions) =>
    toast.info(title, {
      description: options?.description,
      duration: options?.duration ?? defaultDuration,
      icon: createElement(Info, { className: 'h-4 w-4' }),
    }),

  loading: (title: string, options?: NotifyOptions) =>
    toast.loading(title, {
      description: options?.description,
      icon: createElement(Loader2, { className: 'h-4 w-4 animate-spin' }),
    }),
};
