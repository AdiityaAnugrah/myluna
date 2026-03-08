import { useEffect, useRef } from 'react';

/**
 * Hook to show a confirmation dialog when the user tries to leave the page
 * with unsaved changes.
 * 
 * @param isDirty - Boolean indicating if the form has unsaved changes
 * @param onConfirmTrigger - Callback to trigger when navigation is intercepted
 * @param message - Custom message to show in the confirmation dialog
 */
export function useConfirmPageLeave(
  isDirty: boolean,
  onConfirmTrigger?: () => void,
  message = 'Anda memiliki perubahan yang belum disimpan. Yakin ingin meninggalkan halaman ini?'
) {
  const onConfirmRef = useRef(onConfirmTrigger);
  const messageRef = useRef(message);

  // Update refs when they change
  useEffect(() => {
    onConfirmRef.current = onConfirmTrigger;
    messageRef.current = message;
  }, [onConfirmTrigger, message]);

  useEffect(() => {
    const handlePopState = (e: PopStateEvent) => {
      if (isDirty) {
        // Prevent immediate navigation
        if (onConfirmRef.current) {
          onConfirmRef.current();
        } else {
          // Fallback for native confirmation
          if (!window.confirm(messageRef.current)) {
            // Restore the guard state
            window.history.pushState(null, '', window.location.pathname);
          }
        }
      }
    };

    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (isDirty) {
        e.preventDefault();
        e.returnValue = messageRef.current;
        return messageRef.current;
      }
    };

    if (isDirty) {
      // Add a history entry only once when it becomes dirty
      // We check if we already added a state to avoid throttling
      // In a real production app, we might want to check window.history.state
      window.history.pushState({ guarded: true }, '', window.location.pathname);
      
      window.addEventListener('popstate', handlePopState);
      window.addEventListener('beforeunload', handleBeforeUnload);
    }

    return () => {
      window.removeEventListener('popstate', handlePopState);
      window.removeEventListener('beforeunload', handleBeforeUnload);
    };
  }, [isDirty]); // Only re-run when isDirty changes
}
