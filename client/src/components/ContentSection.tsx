import React, { useRef, memo } from 'react';
import { MediaItem } from '../types';
import { MovieCard } from './MovieCard';
import { ChevronLeft, ChevronRight } from 'lucide-react';

interface ContentSectionProps {
  title: string;
  subtitle?: string;
  items: MediaItem[];
  onSelect: (item: MediaItem) => void;
  layout?: 'grid' | 'scroll';
}

export const ContentSection: React.FC<ContentSectionProps> = memo(({
  title,
  subtitle,
  items,
  onSelect,
  layout = 'scroll',
}) => {
  const scrollRef = useRef<HTMLDivElement>(null);

  const handleScroll = (direction: 'left' | 'right') => {
    if (scrollRef.current) {
      const scrollAmount = direction === 'left' ? -360 : 360;
      scrollRef.current.scrollBy({ left: scrollAmount, behavior: 'smooth' });
    }
  };

  if (!items || items.length === 0) return null;

  return (
    <section className="my-5 sm:my-6 content-visibility-auto">
      {/* Header */}
      {title && (
        <div className="flex items-center justify-between mb-2.5 px-1">
          <div>
            <h2 className="text-sm sm:text-base md:text-lg font-semibold text-foreground tracking-tight flex items-center gap-2">
              <span>{title}</span>
              <span className="text-xs font-normal text-muted-foreground">({items.length})</span>
            </h2>
            {subtitle && <p className="text-[11px] sm:text-xs text-muted-foreground mt-0.5">{subtitle}</p>}
          </div>

          {layout === 'scroll' && items.length > 4 && (
            <div className="hidden sm:flex items-center gap-1">
              <button
                onClick={() => handleScroll('left')}
                className="w-7 h-7 rounded-lg bg-card border border-border text-muted-foreground hover:text-foreground hover:bg-muted flex items-center justify-center transition-colors"
                aria-label="Scroll Left"
              >
                <ChevronLeft size={16} />
              </button>
              <button
                onClick={() => handleScroll('right')}
                className="w-7 h-7 rounded-lg bg-card border border-border text-muted-foreground hover:text-foreground hover:bg-muted flex items-center justify-center transition-colors"
                aria-label="Scroll Right"
              >
                <ChevronRight size={16} />
              </button>
            </div>
          )}
        </div>
      )}

      {/* Grid or Scroll Container */}
      {layout === 'scroll' ? (
        <div
          ref={scrollRef}
          className="flex items-stretch gap-2.5 sm:gap-3 overflow-x-auto scroll-touch scrollbar-none pb-2 pt-0.5 px-0.5"
        >
          {items.map((item, idx) => (
            <div key={`${item._id || item.record_id || idx}-${idx}`} className="flex-none w-[130px] sm:w-[155px] md:w-[165px] snap-card">
              <MovieCard item={item} onSelect={onSelect} />
            </div>
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-2.5 sm:gap-3">
          {items.map((item, idx) => (
            <MovieCard key={`${item._id || item.record_id || idx}-${idx}`} item={item} onSelect={onSelect} />
          ))}
        </div>
      )}
    </section>
  );
});

ContentSection.displayName = 'ContentSection';
