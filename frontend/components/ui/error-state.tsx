import { AlertCircle, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';

interface ErrorStateProps {
  message?: string;
  onRetry?: () => void;
  compact?: boolean;
}

export function ErrorState({ 
  message = 'Terjadi kesalahan saat memuat data', 
  onRetry,
  compact = false 
}: ErrorStateProps) {
  if (compact) {
    return (
      <div className="flex items-center justify-center gap-2 p-4 text-sm text-muted-foreground">
        <AlertCircle className="h-4 w-4 text-destructive" />
        <span>{message}</span>
        {onRetry && (
          <Button variant="ghost" size="sm" onClick={onRetry}>
            <RefreshCw className="h-3 w-3 mr-1" />
            Coba Lagi
          </Button>
        )}
      </div>
    );
  }

  return (
    <Card className="border-destructive/50">
      <CardContent className="flex flex-col items-center justify-center py-12 px-8 text-center">
        <div className="p-4 bg-destructive/10 rounded-full mb-4">
          <AlertCircle className="h-8 w-8 text-destructive" />
        </div>
        <h3 className="text-lg font-semibold mb-2">Oops! Ada Masalah</h3>
        <p className="text-sm text-muted-foreground mb-6 max-w-md">{message}</p>
        {onRetry && (
          <Button onClick={onRetry} variant="outline">
            <RefreshCw className="h-4 w-4 mr-2" />
            Coba Lagi
          </Button>
        )}
      </CardContent>
    </Card>
  );
}
