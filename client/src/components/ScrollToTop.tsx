import React, { useState, useEffect } from 'react';
import { ArrowUp } from 'lucide-react';

export const ScrollToTop: React.FC = () => {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      setVisible(window.scrollY > 400);
    };
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const scrollToTop = () => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  if (!visible) return null;

  return (
    <button
      onClick={scrollToTop}
      className="fixed right-5 bottom-24 md:bottom-8 z-40 p-3 rounded-2xl bg-primary hover:bg-primary/90 text-primary-foreground shadow-lg border border-border/20 transition-all duration-300 hover:scale-105 active:scale-95 animate-fadeIn"
      aria-label="Scroll to top"
    >
      <ArrowUp size={18} />
    </button>
  );
};
