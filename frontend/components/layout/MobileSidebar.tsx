'use client';

import { useState } from 'react';
import { Sidebar } from '@/components/layout/Sidebar';
import { Button } from '@/components/ui/button';
import { Menu, X } from 'lucide-react';
import { cn } from '@/lib/utils';

export function MobileSidebar() {
  const [open, setOpen] = useState(false);

  return (
    <>
      <Button 
        variant="ghost" 
        size="icon" 
        className="md:hidden -ml-2" 
        onClick={() => setOpen(true)}
      >
        <Menu className="h-6 w-6" />
        <span className="sr-only">Menu</span>
      </Button>

      {/* Overlay */}
      <div 
        className={cn(
          "fixed inset-0 z-[100] bg-black/80 backdrop-blur-sm transition-all duration-300 md:hidden",
          open ? "opacity-100 visible" : "opacity-0 invisible pointer-events-none"
        )}
        onClick={() => setOpen(false)}
      />

      {/* Sidebar Drawer */}
      <div 
        className={cn(
          "fixed inset-y-0 left-0 z-[100] h-full w-[85%] max-w-xs border-r bg-background p-0 shadow-lg transition-transform duration-300 ease-in-out md:hidden",
          open ? "translate-x-0" : "-translate-x-full"
        )}
      >
        <div className="absolute right-4 top-4 z-[110]">
             <Button
                variant="ghost"
                size="icon"
                onClick={() => setOpen(false)}
                className="hover:bg-sidebar-accent/50 text-sidebar-foreground"
             >
                <X className="h-5 w-5" />
                <span className="sr-only">Close</span>
             </Button>
        </div>
        
         <div className="h-full overflow-hidden">
             <Sidebar isMobile onScanClick={() => setOpen(false)} /> 
         </div>
      </div>
    </>
  );
}
