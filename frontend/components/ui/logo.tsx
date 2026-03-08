import { cn } from "@/lib/utils";

interface LogoProps {
  className?: string;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  showText?: boolean;
}

export function Logo({ className, size = 'md', showText = true }: LogoProps) {
  const sizeClasses = {
    sm: 'text-xs gap-1',
    md: 'text-lg gap-1.5',
    lg: 'text-2xl gap-2',
    xl: 'text-4xl gap-2.5',
  };

  const circleSize = {
    sm: 'h-4 w-4',
    md: 'h-7 w-7',
    lg: 'h-9 w-9',
    xl: 'h-14 w-14',
  };

  const fontSizeChar = {
    sm: 'text-[10px]',
    md: 'text-sm',
    lg: 'text-xl',
    xl: 'text-2xl',
  };

  if (!showText) {
    return (
      <div className={cn("bg-primary rounded-full flex items-center justify-center text-white shrink-0 shadow-lg shadow-primary/20", circleSize[size], className)}>
        <span className={cn("font-bold", fontSizeChar[size])}>N</span>
      </div>
    );
  }

  return (
    <div className={cn("flex items-center font-black tracking-widest select-none", sizeClasses[size], className)}>
      <span className="text-foreground/90">L</span>
      <span className="text-foreground/90">U</span>
      <div className={cn("bg-primary rounded-full flex items-center justify-center text-white shrink-0 shadow-md shadow-primary/10", circleSize[size])}>
        <span className={cn("font-bold", fontSizeChar[size])}>N</span>
      </div>
      <span className="text-foreground/90">A</span>
      <span className="text-foreground/90">R</span>
      <span className="text-foreground/90">E</span>
      <span className="text-foreground/90">A</span>
    </div>
  );
}
