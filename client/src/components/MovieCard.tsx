import React, { useState, memo } from 'react';
import { MediaItem } from '../types';

interface MovieCardProps {
  item: MediaItem;
  onSelect: (item: MediaItem) => void;
}

export const MovieCard: React.FC<MovieCardProps> = memo(({ item, onSelect }) => {
  const [imgError, setImgError] = useState(false);

  // Extract release year from title or date
  const yearMatch = item.title.match(/\b(19\d{2}|20\d{2})\b/);
  const releaseYear = yearMatch ? yearMatch[0] : (item.date ? new Date(item.date).getFullYear() : null);

  // Extract resolution tag
  const quality = item.categories?.match(/\b(4K|2160p|1080p|720p|480p)\b/i)?.[0] || null;

  // Placeholder image
  const posterUrl = !imgError && item.featured_image
    ? item.featured_image
    : 'https://images.unsplash.com/photo-1518709268805-4e9042af2176?w=400&h=600&fit=crop';

  return (
    <div
      onClick={() => onSelect(item)}
      className="group relative cursor-pointer flex flex-col rounded-xl overflow-hidden bg-card border border-border hover:border-primary/50 active:scale-[0.98] transition-all duration-150 shadow-sm gpu-layer select-none"
    >
      {/* Poster */}
      <div className="relative aspect-[2/3] w-full overflow-hidden bg-muted">
        <img
          src={posterUrl}
          alt={item.title}
          onError={() => setImgError(true)}
          loading="lazy"
          decoding="async"
          className="w-full h-full object-cover transition-transform duration-200 group-hover:scale-102"
        />

        {/* Quality Tag */}
        {quality && (
          <div className="absolute top-1.5 left-1.5 px-1.5 py-0.5 rounded-md bg-background/85 backdrop-blur-sm text-[10px] font-semibold text-foreground border border-border uppercase">
            {quality}
          </div>
        )}

        {/* Year Tag */}
        {releaseYear && (
          <div className="absolute top-1.5 right-1.5 px-1.5 py-0.5 rounded-md bg-background/85 backdrop-blur-sm text-[10px] font-medium text-muted-foreground border border-border">
            {releaseYear}
          </div>
        )}
      </div>

      {/* Info */}
      <div className="p-2 sm:p-2.5 flex flex-col justify-between flex-1">
        <h3 className="font-medium text-xs sm:text-sm text-foreground group-hover:text-primary transition-colors line-clamp-1 leading-snug">
          {item.title}
        </h3>

        {item.categories && (
          <p className="text-[10px] sm:text-[11px] text-muted-foreground mt-0.5 line-clamp-1">
            {item.categories.split(',').slice(0, 2).join(' • ')}
          </p>
        )}
      </div>
    </div>
  );
});

MovieCard.displayName = 'MovieCard';
