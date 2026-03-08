'use client';

import { ProtectedRoute } from '@/components/layout/ProtectedRoute';
import { Sidebar } from '@/components/layout/Sidebar';
import { Header } from '@/components/layout/Header';
import { useKeyboardShortcuts } from '@/lib/hooks/useKeyboardShortcuts';
import { KeyboardShortcutsHelp } from '@/components/ui/keyboard-shortcuts-help';
import { useActivityTracker } from '@/lib/hooks/useActivityTracker';

import { MobileNav } from '@/components/layout/MobileNav';
import { OnboardingTour } from '@/components/ui/OnboardingTour';
import { useEffect, useState } from 'react';

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const [mounted, setMounted] = useState(false);
  const { showHelp, setShowHelp } = useKeyboardShortcuts();
  
  useActivityTracker();
  
  useEffect(() => {
    setMounted(true);
  }, []);

  // Use a fallback loading or hide until mounted to prevent global layout hydration mismatches
  if (!mounted) {
    return (
      <div className="flex h-[100dvh] w-full bg-muted/40 items-center justify-center">
        <div className="animate-pulse flex flex-col items-center gap-4">
          <div className="h-12 w-12 rounded-full border-4 border-primary border-t-transparent animate-spin" />
          <p className="text-sm text-muted-foreground font-medium">Memuat...</p>
        </div>
      </div>
    );
  }

  return (
    <ProtectedRoute>
      <MobileNav />
      <div className="flex h-[100dvh] w-full bg-muted/40 overflow-hidden">
        {/* Sidebar wrapper for desktop - consider handling mobile visibility later */}
        <div className="hidden md:block h-full">
           <Sidebar />
        </div>
        <div className="flex flex-1 flex-col h-full overflow-hidden relative">
          <Header />
          <main className="flex-1 overflow-y-auto overflow-x-hidden p-4 md:p-6 lg:p-8 scroll-smooth">
            {children}
          </main>
        </div>
      </div>
      
      {/* Keyboard Shortcuts Help Modal */}
      <KeyboardShortcutsHelp open={showHelp} onOpenChange={setShowHelp} />
      
      {/* Global Onboarding Tour */}
      <OnboardingTour />
    </ProtectedRoute>
  );
}
