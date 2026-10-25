import React, { useState, useEffect } from 'react';
import { usePWA } from '../services/pwa';
import { Download, X, Share, PlusSquare, WifiOff, Wifi, Sparkles } from 'lucide-react';

const DISMISS_KEY = 'nineropes_pwa_dismissed_until';
const DISMISS_DURATION_MS = 5 * 24 * 60 * 60 * 1000; // 5 days cooldown

export const PWAInstallBanner: React.FC = () => {
  const { canInstall, isStandalone, isOnline, isIos, promptInstall } = usePWA();
  const [showBanner, setShowBanner] = useState<boolean>(false);
  const [showIosModal, setShowIosModal] = useState<boolean>(false);
  const [wasOffline, setWasOffline] = useState<boolean>(false);
  const [showOnlineToast, setShowOnlineToast] = useState<boolean>(false);

  // Check dismissal cooldown
  useEffect(() => {
    if (isStandalone) {
      setShowBanner(false);
      return;
    }

    try {
      const dismissedUntil = localStorage.getItem(DISMISS_KEY);
      if (dismissedUntil && Date.now() < parseInt(dismissedUntil, 10)) {
        setShowBanner(false);
        return;
      }
    } catch {
      // LocalStorage unavailable
    }

    // Show banner if installable or on iOS Safari
    if (canInstall || (isIos && !isStandalone)) {
      // Small 2-second delay so it does not pop up instantly on first load
      const timer = setTimeout(() => setShowBanner(true), 2500);
      return () => clearTimeout(timer);
    }
  }, [canInstall, isStandalone, isIos]);

  // Online / Offline transitions
  useEffect(() => {
    if (!isOnline) {
      setWasOffline(true);
      setShowOnlineToast(false);
    } else if (wasOffline) {
      setShowOnlineToast(true);
      const timer = setTimeout(() => {
        setShowOnlineToast(false);
        setWasOffline(false);
      }, 3500);
      return () => clearTimeout(timer);
    }
  }, [isOnline, wasOffline]);

  const handleDismiss = () => {
    setShowBanner(false);
    try {
      localStorage.setItem(DISMISS_KEY, (Date.now() + DISMISS_DURATION_MS).toString());
    } catch {
      // Ignore storage errors
    }
  };

  const handleInstallClick = async () => {
    if (isIos) {
      setShowIosModal(true);
      return;
    }
    const success = await promptInstall();
    if (success) {
      setShowBanner(false);
    }
  };

  return (
    <>
      {/* 1. Offline / Back Online Toast Pill */}
      {!isOnline && (
        <div className="fixed top-3 left-1/2 -translate-x-1/2 z-50 flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-amber-950/90 text-amber-200 border border-amber-800/80 text-xs font-medium shadow-lg backdrop-blur-md animate-fadeIn">
          <WifiOff className="w-3.5 h-3.5 text-amber-400 animate-pulse" />
          <span>Offline mode — viewing cached titles</span>
        </div>
      )}

      {showOnlineToast && (
        <div className="fixed top-3 left-1/2 -translate-x-1/2 z-50 flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-emerald-950/90 text-emerald-200 border border-emerald-800/80 text-xs font-medium shadow-lg backdrop-blur-md animate-fadeIn">
          <Wifi className="w-3.5 h-3.5 text-emerald-400" />
          <span>Connection restored</span>
        </div>
      )}

      {/* 2. Floating PWA Install Banner */}
      {showBanner && !isStandalone && (
        <aside
          aria-label="Install App"
          className="fixed bottom-20 md:bottom-6 right-4 left-4 md:left-auto md:w-96 z-40 bg-card/95 text-card-foreground border border-border/80 rounded-2xl p-3.5 shadow-2xl backdrop-blur-xl animate-fadeIn transition-all duration-300"
        >
          <div className="flex items-start gap-3">
            {/* App Icon Badge */}
            <div className="relative shrink-0 w-11 h-11 rounded-xl bg-gradient-to-br from-[#2a2a28] to-[#161615] border border-border/60 p-1.5 flex items-center justify-center shadow-md">
              <img src="/favicon.svg" alt="NINEROPES" className="w-full h-full object-contain" />
              <div className="absolute -top-1 -right-1 w-3.5 h-3.5 rounded-full bg-primary flex items-center justify-center shadow-sm">
                <Sparkles className="w-2 h-2 text-primary-foreground" />
              </div>
            </div>

            {/* Banner Text */}
            <div className="flex-1 min-w-0 pr-1">
              <div className="flex items-center gap-1.5">
                <h4 className="text-xs font-bold tracking-tight text-foreground">Install NINEROPES App</h4>
                <span className="text-[10px] font-semibold uppercase px-1.5 py-0.5 rounded bg-primary/15 text-primary">PWA</span>
              </div>
              <p className="text-[11px] text-muted-foreground mt-0.5 leading-snug">
                One-tap full screen cinema, faster streaming, and offline catalog access.
              </p>

              {/* Action Buttons */}
              <div className="flex items-center gap-2 mt-2.5">
                <button
                  type="button"
                  onClick={handleInstallClick}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-primary hover:bg-primary/90 text-primary-foreground text-xs font-semibold shadow-sm transition-transform active:scale-95"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>Install App</span>
                </button>
                <button
                  type="button"
                  onClick={handleDismiss}
                  className="px-2.5 py-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-accent text-xs font-medium transition-colors"
                >
                  Not now
                </button>
              </div>
            </div>

            {/* Dismiss Cross */}
            <button
              type="button"
              onClick={handleDismiss}
              aria-label="Dismiss banner"
              className="shrink-0 p-1 text-muted-foreground hover:text-foreground rounded-md hover:bg-accent transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </aside>
      )}

      {/* 3. iOS Safari Instructions Modal */}
      {showIosModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-end sm:items-center justify-center p-4 animate-fadeIn">
          <div className="bg-card text-card-foreground border border-border w-full max-w-sm rounded-2xl p-5 shadow-2xl relative">
            <button
              type="button"
              onClick={() => setShowIosModal(false)}
              className="absolute top-4 right-4 p-1 rounded-lg text-muted-foreground hover:text-foreground hover:bg-accent"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="flex items-center gap-3 mb-4">
              <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-[#2a2a28] to-[#161615] border border-border p-2">
                <img src="/favicon.svg" alt="NINEROPES" className="w-full h-full object-contain" />
              </div>
              <div>
                <h3 className="font-bold text-sm text-foreground">Install on iOS</h3>
                <p className="text-xs text-muted-foreground">Add NINEROPES to your Home Screen</p>
              </div>
            </div>

            <ol className="space-y-3 text-xs text-foreground/90 my-4">
              <li className="flex items-start gap-2.5">
                <span className="shrink-0 w-5 h-5 rounded-full bg-primary/15 text-primary font-bold flex items-center justify-center text-[10px]">1</span>
                <span>
                  Tap the <strong className="text-foreground inline-flex items-center gap-1 mx-0.5"><Share className="w-3.5 h-3.5 text-primary" /> Share</strong> button in Safari toolbar.
                </span>
              </li>
              <li className="flex items-start gap-2.5">
                <span className="shrink-0 w-5 h-5 rounded-full bg-primary/15 text-primary font-bold flex items-center justify-center text-[10px]">2</span>
                <span>
                  Scroll down and tap <strong className="text-foreground inline-flex items-center gap-1 mx-0.5"><PlusSquare className="w-3.5 h-3.5 text-primary" /> Add to Home Screen</strong>.
                </span>
              </li>
              <li className="flex items-start gap-2.5">
                <span className="shrink-0 w-5 h-5 rounded-full bg-primary/15 text-primary font-bold flex items-center justify-center text-[10px]">3</span>
                <span>Tap <strong className="text-foreground">Add</strong> in the top-right corner to finish.</span>
              </li>
            </ol>

            <button
              type="button"
              onClick={() => setShowIosModal(false)}
              className="w-full py-2.5 rounded-xl bg-primary text-primary-foreground font-semibold text-xs transition active:scale-98 shadow-sm"
            >
              Got it
            </button>
          </div>
        </div>
      )}
    </>
  );
};
