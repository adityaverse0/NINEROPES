import { useState, useEffect, useCallback } from 'react';

// Extend Window interface for beforeinstallprompt event
interface BeforeInstallPromptEvent extends Event {
  readonly platforms: string[];
  readonly userChoice: Promise<{
    outcome: 'accepted' | 'dismissed';
    platform: string;
  }>;
  prompt(): Promise<void>;
}

declare global {
  interface WindowEventMap {
    beforeinstallprompt: BeforeInstallPromptEvent;
  }
}

// Global state singleton so prompt is never lost between component unmounts
let deferredPrompt: BeforeInstallPromptEvent | null = null;
const listeners = new Set<() => void>();

function notifyListeners() {
  listeners.forEach(fn => fn());
}

// Check if running in standalone PWA mode
export function isStandaloneMode(): boolean {
  if (typeof window === 'undefined') return false;
  return (
    window.matchMedia('(display-mode: standalone)').matches ||
    window.matchMedia('(display-mode: fullscreen)').matches ||
    (window.navigator as any).standalone === true ||
    document.referrer.includes('android-app://')
  );
}

// Check if running on iOS Safari
export function isIosSafari(): boolean {
  if (typeof window === 'undefined') return false;
  const ua = window.navigator.userAgent.toLowerCase();
  const isIos = /iphone|ipad|ipod/.test(ua);
  const isWebkit = /safari/.test(ua) && !/chrome|crios|fxios|android/.test(ua);
  return isIos && isWebkit;
}

// Service worker registration
export function registerServiceWorker() {
  if (typeof window === 'undefined' || !('serviceWorker' in navigator)) return;

  window.addEventListener('load', async () => {
    try {
      const reg = await navigator.serviceWorker.register('/sw.js', { scope: '/' });
      console.log('[PWA] Service Worker registered with scope:', reg.scope);

      // Listen for updates
      reg.addEventListener('updatefound', () => {
        const newWorker = reg.installing;
        if (newWorker) {
          newWorker.addEventListener('statechange', () => {
            if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
              console.log('[PWA] New update available');
              notifyListeners();
            }
          });
        }
      });
    } catch (err) {
      console.warn('[PWA] Service Worker registration failed:', err);
    }
  });

  // Capture install prompt
  window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault();
    deferredPrompt = e;
    console.log('[PWA] Captured beforeinstallprompt event');
    notifyListeners();
  });

  window.addEventListener('appinstalled', () => {
    deferredPrompt = null;
    console.log('[PWA] App successfully installed');
    notifyListeners();
  });
}

// React Hook for PWA Capabilities
export function usePWA() {
  const [canInstall, setCanInstall] = useState<boolean>(() => !!deferredPrompt && !isStandaloneMode());
  const [isStandalone, setIsStandalone] = useState<boolean>(() => isStandaloneMode());
  const [isOnline, setIsOnline] = useState<boolean>(() => typeof navigator !== 'undefined' ? navigator.onLine : true);
  const [isIos] = useState<boolean>(() => isIosSafari());
  const [hasUpdate, setHasUpdate] = useState<boolean>(false);

  useEffect(() => {
    const handleUpdate = () => {
      setCanInstall(!!deferredPrompt && !isStandaloneMode());
      setIsStandalone(isStandaloneMode());
      if ('serviceWorker' in navigator && navigator.serviceWorker.controller) {
        navigator.serviceWorker.getRegistration().then((reg) => {
          if (reg?.waiting) setHasUpdate(true);
        });
      }
    };

    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    listeners.add(handleUpdate);

    // Initial check
    handleUpdate();

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
      listeners.delete(handleUpdate);
    };
  }, []);

  const promptInstall = useCallback(async (): Promise<boolean> => {
    if (!deferredPrompt) {
      console.warn('[PWA] Install prompt not available');
      return false;
    }

    try {
      await deferredPrompt.prompt();
      const choice = await deferredPrompt.userChoice;
      console.log('[PWA] User response to install:', choice.outcome);
      if (choice.outcome === 'accepted') {
        deferredPrompt = null;
        setCanInstall(false);
        return true;
      }
    } catch (err) {
      console.error('[PWA] Install prompt error:', err);
    }
    return false;
  }, []);

  const applyUpdate = useCallback(() => {
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.ready.then((reg) => {
        reg.waiting?.postMessage({ type: 'SKIP_WAITING' });
        window.location.reload();
      });
    }
  }, []);

  return {
    canInstall,
    isStandalone,
    isOnline,
    isIos,
    hasUpdate,
    promptInstall,
    applyUpdate,
  };
}
