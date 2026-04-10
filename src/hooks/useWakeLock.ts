import { useEffect, useRef } from 'react';

/**
 * A custom hook to request the Screen Wake Lock API when `isActive` is true.
 * Automatically handles re-acquiring the lock if the user tabs out and comes back,
 * and seamlessly releases it when the game is over.
 */
export const useWakeLock = (isActive: boolean) => {
    const wakeLockRef = useRef<any>(null);

    useEffect(() => {
        // If not active, or unsupported by browser, ignore quietly
        if (!isActive || !('wakeLock' in navigator)) return;

        let isMounted = true;

        const requestWakeLock = async () => {
            try {
                if (document.visibilityState === 'visible') {
                    wakeLockRef.current = await (navigator as any).wakeLock.request('screen');
                }
            } catch (err) {
                // Silently fail. Often blocked if the device is in Low Power Mode.
                console.debug('Wake Lock request denied or failed:', err);
            }
        };

        const handleVisibilityChange = () => {
            // Wake Locks are automatically released by the OS when the tab becomes hidden.
            // When we become visible again, we must re-request it.
            if (document.visibilityState === 'visible' && isMounted) {
                requestWakeLock();
            }
        };

        // Initial request
        requestWakeLock();

        // Listen for tab switching to restore the lock
        document.addEventListener('visibilitychange', handleVisibilityChange);

        return () => {
            isMounted = false;
            document.removeEventListener('visibilitychange', handleVisibilityChange);
            if (wakeLockRef.current) {
                wakeLockRef.current.release().catch(() => {});
                wakeLockRef.current = null;
            }
        };
    }, [isActive]);
};
