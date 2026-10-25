import React, { useState, useEffect, useRef } from 'react';
import { CinemaMode, ViewTab } from '../types';
import { Search, X, History, Sparkles, Sun, Moon, Compass, Flame, Film, Tv, Download } from 'lucide-react';
import { NavBar, NavItem } from './ui/tubelight-navbar';
import { usePWA } from '../services/pwa';

interface HeaderProps {
  activeTab: ViewTab;
  onTabChange: (tab: ViewTab) => void;
  cinemaMode: CinemaMode;
  onCinemaModeChange: (mode: CinemaMode) => void;
  searchQuery: string;
  onSearchChange: (query: string) => void;
  isSearching: boolean;
  suggestions: string[];
  searchHistory: string[];
  onSelectSuggestion: (title: string) => void;
  onSearchSubmit?: (query: string) => void;
}

const navItems: NavItem[] = [
  { name: 'Explore', url: '#explore', icon: Compass },
  { name: 'Trending', url: '#trending', icon: Flame },
  { name: 'Movies', url: '#movies', icon: Film },
  { name: 'Series', url: '#series', icon: Tv },
  { name: 'Anime', url: '#anime', icon: Sparkles },
];

const tabMap: Record<string, ViewTab> = {
  explore: 'home',
  trending: 'trending',
  movies: 'movies',
  series: 'series',
  anime: 'anime',
};

const revTabMap: Record<ViewTab, string> = {
  home: 'Explore',
  trending: 'Trending',
  movies: 'Movies',
  series: 'Series',
  anime: 'Anime',
};

export const Header: React.FC<HeaderProps> = ({
  activeTab,
  onTabChange,
  cinemaMode,
  onCinemaModeChange,
  searchQuery,
  onSearchChange,
  isSearching,
  suggestions,
  searchHistory,
  onSelectSuggestion,
  onSearchSubmit,
}) => {
  const [showDropdown, setShowDropdown] = useState(false);
  const [isDark, setIsDark] = useState(() => {
    if (typeof window !== 'undefined') {
      return document.documentElement.classList.contains('dark');
    }
  });
  const { canInstall, isIos, isStandalone, promptInstall } = usePWA();
  const searchContainerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setShowDropdown(false);
    inputRef.current?.blur();
    if (searchQuery.trim()) {
      onSearchSubmit?.(searchQuery.trim());
    }
  };

  // Toggle Dark / Light Theme
  const toggleTheme = () => {
    const root = document.documentElement;
    if (root.classList.contains('dark')) {
      root.classList.remove('dark');
      setIsDark(false);
    } else {
      root.classList.add('dark');
      setIsDark(true);
    }
  };

  // Close dropdown on click outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (searchContainerRef.current && !searchContainerRef.current.contains(e.target as Node)) {
        setShowDropdown(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <header className="sticky top-0 z-40 bg-background/90 backdrop-blur-md border-b border-border transition-colors">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 py-2.5 flex items-center justify-between gap-3 sm:gap-4">
        {/* Brand / Logo */}
        <div
          onClick={() => { onTabChange('home'); onSearchChange(''); }}
          className="flex items-center gap-2.5 cursor-pointer flex-shrink-0 select-none group"
        >
          <div className="w-8 h-8 rounded-lg bg-primary text-primary-foreground flex items-center justify-center font-bold text-sm shadow-sm transition-transform group-hover:scale-105">
            N
          </div>
          <span className="font-bold text-base sm:text-lg tracking-wider text-foreground group-hover:text-primary transition-colors">
            NINEROPES
          </span>
        </div>

        {/* Desktop Tubelight Navigation Bar */}
        <div className="hidden md:block">
          <NavBar
            items={navItems}
            activeTab={searchQuery ? '' : revTabMap[activeTab]}
            onTabChange={(name) => {
              const tab = tabMap[name.toLowerCase()];
              if (tab) {
                onTabChange(tab);
                onSearchChange('');
              }
            }}
            layoutId="lamp-desktop"
            className="relative bottom-auto sm:top-auto left-auto translate-x-0 mb-0 sm:pt-0"
          />
        </div>

        {/* Right Actions: Search + Cinema Mode + Theme Switcher */}
        <div className="flex items-center gap-2 flex-1 max-w-sm justify-end">
          {/* Search Bar with Autocomplete */}
          <div ref={searchContainerRef} className="relative flex-1">
            <form onSubmit={handleSearchSubmit} className="relative flex items-center">
              <Search className="absolute left-3 text-muted-foreground pointer-events-none" size={15} />
              <input
                ref={inputRef}
                type="text"
                value={searchQuery}
                onChange={e => {
                  onSearchChange(e.target.value);
                  setShowDropdown(true);
                }}
                onFocus={() => setShowDropdown(true)}
                placeholder="Search catalog..."
                className="w-full bg-card text-sm text-foreground rounded-full pl-9 pr-8 py-1.5 border border-border focus:border-ring focus:outline-none transition-colors placeholder:text-muted-foreground"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => onSearchChange('')}
                  className="absolute right-2.5 text-muted-foreground hover:text-foreground p-0.5"
                  aria-label="Clear search"
                >
                  <X size={14} />
                </button>
              )}
              {isSearching && (
                <div className="absolute right-7 w-3.5 h-3.5 border-2 border-primary border-t-transparent rounded-full animate-spin" />
              )}
            </form>

            {/* Autocomplete Dropdown */}
            {showDropdown && (suggestions.length > 0 || searchHistory.length > 0) && (
              <div className="absolute top-full mt-1.5 left-0 right-0 bg-popover text-popover-foreground border border-border rounded-xl shadow-xl overflow-hidden z-50 animate-fadeIn">
                {suggestions.length > 0 && (
                  <div className="p-1.5">
                    <div className="text-[11px] font-medium text-muted-foreground px-2.5 py-1 flex items-center gap-1">
                      <Sparkles size={11} />
                      <span>Suggestions</span>
                    </div>
                    {suggestions.map((item, idx) => (
                      <button
                        key={idx}
                        onClick={() => {
                          onSelectSuggestion(item);
                          setShowDropdown(false);
                        }}
                        className="w-full text-left px-2.5 py-1.5 rounded-lg text-xs text-foreground hover:bg-muted flex items-center gap-2 truncate transition-colors"
                      >
                        <Search size={12} className="text-muted-foreground flex-shrink-0" />
                        <span className="truncate">{item}</span>
                      </button>
                    ))}
                  </div>
                )}

                {searchHistory.length > 0 && (
                  <div className="p-1.5 border-t border-border">
                    <div className="text-[11px] font-medium text-muted-foreground px-2.5 py-1 flex items-center gap-1">
                      <History size={11} />
                      <span>Recent Searches</span>
                    </div>
                    {searchHistory.slice(0, 5).map((query, idx) => (
                      <button
                        key={idx}
                        onClick={() => {
                          onSelectSuggestion(query);
                          setShowDropdown(false);
                        }}
                        className="w-full text-left px-2.5 py-1.5 rounded-lg text-xs text-muted-foreground hover:text-foreground hover:bg-muted flex items-center gap-2 truncate transition-colors"
                      >
                        <span className="truncate">{query}</span>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Cinema Mode Filter Pills */}
          <div className="hidden xl:flex items-center gap-1 bg-card p-0.5 rounded-full border border-border text-xs">
            <button
              onClick={() => onCinemaModeChange('all')}
              className={`px-2.5 py-1 rounded-full font-medium transition-colors ${
                cinemaMode === 'all'
                  ? 'bg-primary text-primary-foreground shadow-xs'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              All
            </button>
            <button
              onClick={() => onCinemaModeChange('hollywood')}
              className={`px-2.5 py-1 rounded-full font-medium transition-colors ${
                cinemaMode === 'hollywood'
                  ? 'bg-primary text-primary-foreground shadow-xs'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              Hollywood
            </button>
            <button
              onClick={() => onCinemaModeChange('bollywood')}
              className={`px-2.5 py-1 rounded-full font-medium transition-colors ${
                cinemaMode === 'bollywood'
                  ? 'bg-primary text-primary-foreground shadow-xs'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              Bollywood
            </button>
          </div>

          {/* PWA Install Button (When installable) */}
          {(canInstall || (isIos && !isStandalone)) && (
            <button
              onClick={() => promptInstall()}
              className="hidden sm:inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-primary/10 hover:bg-primary/20 text-primary border border-primary/25 text-xs font-semibold transition active:scale-95 flex-shrink-0"
              title="Install NINEROPES App"
              aria-label="Install App"
            >
              <Download size={13} />
              <span className="hidden md:inline">Install App</span>
            </button>
          )}

          {/* Light / Dark Mode Toggle */}
          <button
            onClick={toggleTheme}
            className="w-8 h-8 rounded-full bg-card hover:bg-muted border border-border text-muted-foreground hover:text-foreground flex items-center justify-center transition-colors flex-shrink-0"
            title={isDark ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
            aria-label="Toggle theme"
          >
            {isDark ? <Sun size={15} /> : <Moon size={15} />}
          </button>
        </div>
      </div>
    </header>
  );
};
