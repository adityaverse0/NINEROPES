import React, { useRef } from 'react';
import { Search, X, ArrowRight } from 'lucide-react';

interface SearchHeroProps {
  query: string;
  onQueryChange: (q: string) => void;
  onTagClick: (tag: string) => void;
  onSearchSubmit?: (q: string) => void;
  totalTitles?: number;
}

export const SearchHero: React.FC<SearchHeroProps> = ({
  query,
  onQueryChange,
  onTagClick,
  onSearchSubmit,
  totalTitles = 19689,
}) => {
  const inputRef = useRef<HTMLInputElement>(null);

  const quickTags = [
    'Marvel',
    'Anime',
    'Dual Audio',
    '4K UHD',
    'Korean',
    'Bollywood',
    'Action',
    'Sci-Fi'
  ];

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (query.trim()) {
      onSearchSubmit?.(query.trim());
      inputRef.current?.blur();
    }
  };

  const handleClear = () => {
    onQueryChange('');
    inputRef.current?.focus();
  };

  return (
    <div className="py-6 sm:py-10 px-4 max-w-3xl mx-auto text-center select-none">
      <h1 className="text-2xl sm:text-3xl font-bold text-foreground tracking-tight mb-2">
        NINEROPES
      </h1>
      <p className="text-xs sm:text-sm text-muted-foreground mb-5">
        Search across {totalTitles.toLocaleString()} titles. Direct stream & package downloads without ads.
      </p>

      {/* Prominent Search Form */}
      <form onSubmit={handleSubmit} className="relative max-w-xl mx-auto mb-4">
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none" size={18} />
        
        <input
          ref={inputRef}
          type="text"
          value={query}
          onChange={e => onQueryChange(e.target.value)}
          placeholder="Search movie, series, or anime..."
          className="w-full bg-card text-foreground text-sm sm:text-base rounded-2xl pl-11 pr-20 py-3 border border-border focus:border-ring focus:outline-none transition-all shadow-sm placeholder:text-muted-foreground"
          autoFocus
        />

        <div className="absolute right-2.5 top-1/2 -translate-y-1/2 flex items-center gap-1">
          {query && (
            <button
              type="button"
              onClick={handleClear}
              className="p-1 rounded-full text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
              aria-label="Clear search"
            >
              <X size={15} />
            </button>
          )}

          <button
            type="submit"
            className="p-1.5 rounded-xl bg-primary text-primary-foreground hover:bg-primary/90 transition-all flex items-center justify-center shadow-xs"
            aria-label="Submit search"
            title="Search"
          >
            <ArrowRight size={15} />
          </button>
        </div>
      </form>

      {/* Quick Search Suggestions */}
      <div className="flex flex-wrap items-center justify-center gap-1.5 max-w-lg mx-auto">
        <span className="text-xs text-muted-foreground mr-1">Popular:</span>
        {quickTags.map(tag => (
          <button
            key={tag}
            type="button"
            onClick={() => onTagClick(tag)}
            className="px-2.5 py-1 rounded-lg bg-card hover:bg-muted border border-border text-xs text-muted-foreground hover:text-foreground transition-colors"
          >
            {tag}
          </button>
        ))}
      </div>
    </div>
  );
};
