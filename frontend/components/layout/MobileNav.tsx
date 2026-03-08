'use client';

import { Sidebar } from '@/components/layout/Sidebar';
import { Button } from '@/components/ui/button';
import { X } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useUIStore } from '@/lib/stores/ui';

export function MobileNav() {
  const { isMobileNavOpen, closeMobileNav } = useUIStore();

  return (
    <>
      {/* Overlay */}
      <div 
        className={cn(
          "fixed inset-0 z-[100] bg-black/80 backdrop-blur-sm transition-all duration-300 md:hidden",
          isMobileNavOpen ? "opacity-100 visible" : "opacity-0 invisible pointer-events-none"
        )}
        onClick={closeMobileNav}
      />

      {/* Sidebar Drawer */}
      <div 
        className={cn(
          "fixed inset-y-0 left-0 z-[100] h-full w-[85%] max-w-xs border-r bg-background p-0 shadow-lg transition-transform duration-300 ease-in-out md:hidden",
          isMobileNavOpen ? "translate-x-0" : "-translate-x-full"
        )}
      >
        <div className="absolute right-4 top-4 z-[110]">
             <Button
                variant="ghost"
                size="icon"
                onClick={closeMobileNav}
                className="hover:bg-accent/50 text-foreground"
             >
                <X className="h-5 w-5" />
                <span className="sr-only">Close</span>
             </Button>
        </div>
        
         <div className="h-full overflow-hidden">
             <Sidebar isMobile onScanClick={closeMobileNav} /> 
         </div>
      </div>
    </>
  );
}
