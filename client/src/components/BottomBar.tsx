import React, { memo } from 'react';
import { CinemaMode, ViewTab } from '../types';
import { Compass, Flame, Film, Tv, Sparkles } from 'lucide-react';
import { NavBar, NavItem } from './ui/tubelight-navbar';

interface BottomBarProps {
  activeTab: ViewTab;
  onTabChange: (tab: ViewTab) => void;
  cinemaMode: CinemaMode;
  onCinemaModeChange: (mode: CinemaMode) => void;
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

export const BottomBar: React.FC<BottomBarProps> = memo(({
  activeTab,
  onTabChange,
  cinemaMode,
  onCinemaModeChange,
}) => {
  return (
    <div className="fixed bottom-0 left-0 right-0 z-50 md:hidden select-none pointer-events-none pb-[calc(0.5rem+env(safe-area-inset-bottom,0px))]">
      {/* Mobile Cinema Filter Floating Capsule */}
      <div className="flex justify-center mb-1.5 pointer-events-auto">
        <div className="flex items-center gap-1 p-0.5 rounded-full bg-background/90 backdrop-blur-md border border-border shadow-md text-[11px]">
          <button
            onClick={() => onCinemaModeChange('all')}
            className={`px-3 py-0.5 rounded-full font-medium transition-colors active:scale-95 ${
              cinemaMode === 'all' ? 'bg-primary text-primary-foreground' : 'text-muted-foreground'
            }`}
          >
            All
          </button>
          <button
            onClick={() => onCinemaModeChange('hollywood')}
            className={`px-3 py-0.5 rounded-full font-medium transition-colors active:scale-95 ${
              cinemaMode === 'hollywood' ? 'bg-primary text-primary-foreground' : 'text-muted-foreground'
            }`}
          >
            Hollywood
          </button>
          <button
            onClick={() => onCinemaModeChange('bollywood')}
            className={`px-3 py-0.5 rounded-full font-medium transition-colors active:scale-95 ${
              cinemaMode === 'bollywood' ? 'bg-primary text-primary-foreground' : 'text-muted-foreground'
            }`}
          >
            Bollywood
          </button>
        </div>
      </div>

      {/* Floating Tubelight Navbar on Mobile */}
      <div className="pointer-events-auto flex justify-center px-2">
        <NavBar
          items={navItems}
          activeTab={revTabMap[activeTab]}
          onTabChange={(name) => {
            const tab = tabMap[name.toLowerCase()];
            if (tab) onTabChange(tab);
          }}
          layoutId="lamp-mobile"
          className="relative bottom-auto sm:top-auto left-auto translate-x-0 mb-0 sm:pt-0"
        />
      </div>
    </div>
  );
});

BottomBar.displayName = 'BottomBar';
