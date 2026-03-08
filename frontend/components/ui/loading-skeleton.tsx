import { Card, CardContent } from '@/components/ui/card';

export function SkeletonCard() {
  return (
    <Card className="border-none shadow-md bg-card/50 backdrop-blur-sm">
      <CardContent className="p-6">
        <div className="flex items-center justify-between">
          <div className="space-y-2 flex-1">
            <div className="h-3 bg-muted rounded w-1/3 animate-pulse"></div>
            <div className="h-6 bg-muted rounded w-1/2 animate-pulse"></div>
          </div>
          <div className="w-12 h-12 bg-muted rounded-2xl animate-pulse"></div>
        </div>
        <div className="mt-4 h-2 bg-muted rounded w-1/4 animate-pulse"></div>
      </CardContent>
    </Card>
  );
}

export function SkeletonChart() {
  return (
    <Card className="border-border/50 shadow-xl overflow-hidden">
      <CardContent className="p-6">
        <div className="space-y-2 mb-4">
          <div className="h-5 bg-muted rounded w-1/4 animate-pulse"></div>
          <div className="h-3 bg-muted rounded w-1/3 animate-pulse"></div>
        </div>
        <div className="h-[350px] bg-muted rounded animate-pulse"></div>
      </CardContent>
    </Card>
  );
}

export function SkeletonTable() {
  return (
    <div className="space-y-3">
      {[1, 2, 3, 4, 5].map((i) => (
        <div key={i} className="flex gap-4 p-4">
          <div className="h-4 bg-muted rounded w-1/4 animate-pulse"></div>
          <div className="h-4 bg-muted rounded w-1/6 animate-pulse"></div>
          <div className="h-4 bg-muted rounded w-1/6 animate-pulse"></div>
          <div className="h-4 bg-muted rounded w-1/4 animate-pulse ml-auto"></div>
        </div>
      ))}
    </div>
  );
}

export function SkeletonActivity() {
  return (
    <div className="space-y-4">
      {[1, 2, 3, 4, 5].map((i) => (
        <div key={i} className="flex gap-3 px-3 py-2">
          <div className="w-6 h-6 bg-muted rounded-full animate-pulse"></div>
          <div className="flex-1 space-y-2">
            <div className="h-3 bg-muted rounded w-2/3 animate-pulse"></div>
            <div className="h-2 bg-muted rounded w-1/2 animate-pulse"></div>
          </div>
        </div>
      ))}
    </div>
  );
}
