import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { CinemaMode, ViewTab, MediaItem, StatsResponse } from './types';
import { api } from './services/api';
import { Header } from './components/Header';
import { BottomBar } from './components/BottomBar';
import { SearchHero } from './components/SearchHero';
import { ContentSection } from './components/ContentSection';
import { MovieDetailsModal } from './components/MovieDetailsModal';
import { SeriesDetailModal } from './components/SeriesDetailModal';
import { ScrollToTop } from './components/ScrollToTop';
import { PWAInstallBanner } from './components/PWAInstallBanner';
import { X, Film, Tv, Sparkles } from 'lucide-react';

type SearchTypeFilter = 'all' | 'movies' | 'series' | 'anime';

export const App: React.FC = () => {
  // Navigation & View state
  const [activeTab, setActiveTab] = useState<ViewTab>('home');
  const [cinemaMode, setCinemaMode] = useState<CinemaMode>('all');
  const [selectedItem, setSelectedItem] = useState<MediaItem | null>(null);

  // Search state
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<MediaItem[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [searchHistory, setSearchHistory] = useState<string[]>([]);
  const [searchTypeFilter, setSearchTypeFilter] = useState<SearchTypeFilter>('all');
  const activeQueryRef = useRef<string>('');

  // Feed states
  const [mixedItems, setMixedItems] = useState<MediaItem[]>([]);
  const [trendingMovies, setTrendingMovies] = useState<MediaItem[]>([]);
  const [trendingSeries, setTrendingSeries] = useState<MediaItem[]>([]);
  const [latestBollyMovies, setLatestBollyMovies] = useState<MediaItem[]>([]);
  const [latestBollySeries, setLatestBollySeries] = useState<MediaItem[]>([]);
  const [animeItems, setAnimeItems] = useState<MediaItem[]>([]);
  const [stats, setStats] = useState<StatsResponse | null>(null);
  const [loading, setLoading] = useState(true);

  // Initial Data Fetch
  useEffect(() => {
    let isMounted = true;
    const loadCatalog = async () => {
      try {
        const [statsData, mixed, tMovies, tSeries, bollyM, bollyS, anime] = await Promise.allSettled([
          api.getStats(),
          api.getMixed(60),
          api.getTrendingMovies(30),
          api.getTrendingSeries(30),
          api.getLatestBollywoodMovies(30),
          api.getLatestBollywoodSeries(30),
          api.getAnime(30),
        ]);

        if (!isMounted) return;

        if (statsData.status === 'fulfilled') setStats(statsData.value);
        if (mixed.status === 'fulfilled') setMixedItems(mixed.value);
        if (tMovies.status === 'fulfilled') setTrendingMovies(tMovies.value);
        if (tSeries.status === 'fulfilled') setTrendingSeries(tSeries.value);
        if (bollyM.status === 'fulfilled') setLatestBollyMovies(bollyM.value);
        if (bollyS.status === 'fulfilled') setLatestBollySeries(bollyS.value);
        if (anime.status === 'fulfilled') setAnimeItems(anime.value);
      } catch (err) {
        console.error('Failed to load catalog feeds:', err);
      } finally {
        if (isMounted) setLoading(false);
      }
    };

    loadCatalog();
    return () => { isMounted = false; };
  }, []);

  // Content type detector (distinguishes TV Series from Movie)
  const isSeriesItem = useCallback((item: MediaItem): boolean => {
    if (item.source_table?.includes('series') || item.source_table === 'anime') return true;
    if (Object.keys(item).some(key => key.startsWith('season_') && item[key as `season_${number}`])) return true;
    if (item.season_zip || item.season_zip_cloud) return true;
    if (item.categories?.toLowerCase().includes('series')) return true;
    return false;
  }, []);

  const isAnimeItem = useCallback((item: MediaItem): boolean => {
    if (item.source_table === 'anime' || item.contentType === 'anime') return true;
    if (item.categories?.toLowerCase().includes('anime')) return true;
    return false;
  }, []);

  // Core Search Execution (deduplicated & race-condition safe)
  const executeSearch = useCallback(async (query: string) => {
    const trimmed = query.trim();
    activeQueryRef.current = trimmed;

    if (!trimmed) {
      setSearchResults([]);
      setIsSearching(false);
      return;
    }

    setIsSearching(true);
    try {
      const results = await api.search(trimmed);
      // Verify response matches current active query
      if (activeQueryRef.current === trimmed) {
        setSearchResults(results);
        setSearchHistory(prev => [
          trimmed,
          ...prev.filter(q => q.toLowerCase() !== trimmed.toLowerCase())
        ].slice(0, 10));
      }
    } catch (err) {
      console.error('Search error:', err);
      if (activeQueryRef.current === trimmed) {
        setSearchResults([]);
      }
    } finally {
      if (activeQueryRef.current === trimmed) {
        setIsSearching(false);
      }
    }
  }, []);

  // 300ms Debounced Auto-Search when typing
  useEffect(() => {
    const trimmed = searchQuery.trim();
    if (!trimmed || trimmed.length < 2) {
      if (!trimmed) {
        setSearchResults([]);
        setIsSearching(false);
        activeQueryRef.current = '';
      }
      return;
    }

    setIsSearching(true);
    const timer = setTimeout(() => {
      executeSearch(trimmed);
    }, 300);

    return () => clearTimeout(timer);
  }, [searchQuery, executeSearch]);

  // Filter items by current CinemaMode
  const filterByCinema = useCallback((items: MediaItem[]): MediaItem[] => {
    if (cinemaMode === 'all') return items;
    if (cinemaMode === 'hollywood') {
      return items.filter(item => !item.source_table?.toLowerCase().includes('bollywood'));
    }
    if (cinemaMode === 'bollywood') {
      return items.filter(item => item.source_table?.toLowerCase().includes('bollywood'));
    }
    return items;
  }, [cinemaMode]);

  // Filter Search Results by Content Type (All, Movies, Series, Anime)
  const filteredSearchResults = useMemo(() => {
    let list = filterByCinema(searchResults);

    if (searchTypeFilter === 'movies') {
      list = list.filter(item => !isSeriesItem(item) && !isAnimeItem(item));
    } else if (searchTypeFilter === 'series') {
      list = list.filter(item => isSeriesItem(item) && !isAnimeItem(item));
    } else if (searchTypeFilter === 'anime') {
      list = list.filter(item => isAnimeItem(item));
    }

    return list;
  }, [searchResults, searchTypeFilter, filterByCinema, isSeriesItem, isAnimeItem]);

  // Counts for Search Filter Pills
  const searchCounts = useMemo(() => {
    const cinemaFiltered = filterByCinema(searchResults);
    return {
      all: cinemaFiltered.length,
      movies: cinemaFiltered.filter(item => !isSeriesItem(item) && !isAnimeItem(item)).length,
      series: cinemaFiltered.filter(item => isSeriesItem(item) && !isAnimeItem(item)).length,
      anime: cinemaFiltered.filter(item => isAnimeItem(item)).length,
      rawTotal: searchResults.length,
    };
  }, [searchResults, filterByCinema, isSeriesItem, isAnimeItem]);

  // Autocomplete Suggestions
  const suggestions = useMemo(() => {
    if (!searchResults || searchResults.length === 0) return [];
    return searchResults.slice(0, 5).map(item => item.title);
  }, [searchResults]);

  // Memoized Feed Lists for 0-lag rendering
  const filteredTrendingMovies = useMemo(() => filterByCinema(trendingMovies), [filterByCinema, trendingMovies]);
  const filteredTrendingSeries = useMemo(() => filterByCinema(trendingSeries), [filterByCinema, trendingSeries]);
  const filteredMixedItems = useMemo(() => filterByCinema(mixedItems), [filterByCinema, mixedItems]);
  const allMoviesList = useMemo(() => {
    return filterByCinema([...trendingMovies, ...latestBollyMovies, ...mixedItems.filter(m => !isSeriesItem(m))]);
  }, [filterByCinema, trendingMovies, latestBollyMovies, mixedItems, isSeriesItem]);
  const allSeriesList = useMemo(() => {
    return filterByCinema([...trendingSeries, ...latestBollySeries, ...mixedItems.filter(m => isSeriesItem(m))]);
  }, [filterByCinema, trendingSeries, latestBollySeries, mixedItems, isSeriesItem]);

  const handleClearSearch = () => {
    setSearchQuery('');
    setSearchResults([]);
    setIsSearching(false);
    activeQueryRef.current = '';
  };

  const handleTagClick = (tag: string) => {
    setSearchQuery(tag);
    executeSearch(tag);
  };

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col selection:bg-primary selection:text-primary-foreground font-sans transition-colors">
      {/* Header */}
      <Header
        activeTab={activeTab}
        onTabChange={tab => {
          setActiveTab(tab);
          handleClearSearch();
        }}
        cinemaMode={cinemaMode}
        onCinemaModeChange={setCinemaMode}
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
        onSearchSubmit={executeSearch}
        isSearching={isSearching}
        suggestions={suggestions}
        searchHistory={searchHistory}
        onSelectSuggestion={item => {
          setSearchQuery(item);
          executeSearch(item);
        }}
      />

      {/* Main Body */}
      <main className="flex-1 pb-24 md:pb-12 max-w-6xl w-full mx-auto px-4 sm:px-6">
        {/* Prominent Search Hero stays on Explore tab */}
        {activeTab === 'home' && (
          <SearchHero
            query={searchQuery}
            onQueryChange={setSearchQuery}
            onTagClick={handleTagClick}
            onSearchSubmit={executeSearch}
            totalTitles={stats?.total || 19689}
          />
        )}

        {/* Search Results View (Active whenever searchQuery is populated) */}
        {searchQuery.trim().length > 0 ? (
          <div className="my-6 animate-fadeIn">
            {/* Search Header Bar with Stats and Filters */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4 pb-3 border-b border-border">
              <div>
                <div className="flex items-center gap-2">
                  <h2 className="text-base sm:text-lg font-bold text-foreground flex items-center gap-2">
                    <span>Results for "{searchQuery}"</span>
                    <span className="text-xs font-semibold text-muted-foreground px-2 py-0.5 rounded-full bg-muted">
                      {filteredSearchResults.length}
                    </span>
                  </h2>

                  <button
                    onClick={handleClearSearch}
                    className="p-1 rounded-md text-muted-foreground hover:text-foreground hover:bg-muted text-xs flex items-center gap-1 transition-colors"
                    title="Clear search"
                  >
                    <X size={14} />
                    <span className="hidden sm:inline">Clear</span>
                  </button>
                </div>

                {isSearching && (
                  <p className="text-xs text-primary mt-1 flex items-center gap-1.5 animate-pulse">
                    <span className="w-3 h-3 border-2 border-primary border-t-transparent rounded-full animate-spin" />
                    Searching database across movies, series, and anime...
                  </p>
                )}
              </div>

              {/* Type Filter Pills */}
              <div className="flex items-center gap-1 bg-card p-1 rounded-xl border border-border text-xs flex-wrap">
                <button
                  onClick={() => setSearchTypeFilter('all')}
                  className={`px-3 py-1 rounded-lg font-medium transition-colors ${
                    searchTypeFilter === 'all'
                      ? 'bg-primary text-primary-foreground shadow-xs'
                      : 'text-muted-foreground hover:text-foreground'
                  }`}
                >
                  All ({searchCounts.all})
                </button>
                <button
                  onClick={() => setSearchTypeFilter('movies')}
                  className={`px-3 py-1 rounded-lg font-medium transition-colors flex items-center gap-1 ${
                    searchTypeFilter === 'movies'
                      ? 'bg-primary text-primary-foreground shadow-xs'
                      : 'text-muted-foreground hover:text-foreground'
                  }`}
                >
                  <Film size={12} />
                  <span>Movies ({searchCounts.movies})</span>
                </button>
                <button
                  onClick={() => setSearchTypeFilter('series')}
                  className={`px-3 py-1 rounded-lg font-medium transition-colors flex items-center gap-1 ${
                    searchTypeFilter === 'series'
                      ? 'bg-primary text-primary-foreground shadow-xs'
                      : 'text-muted-foreground hover:text-foreground'
                  }`}
                >
                  <Tv size={12} />
                  <span>Series ({searchCounts.series})</span>
                </button>
                <button
                  onClick={() => setSearchTypeFilter('anime')}
                  className={`px-3 py-1 rounded-lg font-medium transition-colors flex items-center gap-1 ${
                    searchTypeFilter === 'anime'
                      ? 'bg-primary text-primary-foreground shadow-xs'
                      : 'text-muted-foreground hover:text-foreground'
                  }`}
                >
                  <Sparkles size={12} />
                  <span>Anime ({searchCounts.anime})</span>
                </button>
              </div>
            </div>

            {/* Results Grid or Empty State */}
            {isSearching && searchResults.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-24 gap-3 text-muted-foreground text-xs">
                <div className="w-7 h-7 border-2 border-primary border-t-transparent rounded-full animate-spin" />
                <span>Searching catalog for "{searchQuery}"...</span>
              </div>
            ) : filteredSearchResults.length > 0 ? (
              <ContentSection
                title=""
                items={filteredSearchResults}
                onSelect={setSelectedItem}
                layout="grid"
              />
            ) : (
              <div className="text-center py-16 px-4 bg-card/60 rounded-2xl border border-border my-6">
                <p className="text-base font-semibold text-foreground">
                  No matches found for "{searchQuery}"
                </p>

                {cinemaMode !== 'all' && searchCounts.rawTotal > 0 ? (
                  <div className="mt-2 space-y-3">
                    <p className="text-xs text-muted-foreground max-w-md mx-auto">
                      Found {searchCounts.rawTotal} matches in other cinema categories that are hidden by your current "{cinemaMode}" filter.
                    </p>
                    <button
                      onClick={() => setCinemaMode('all')}
                      className="px-4 py-2 rounded-xl bg-primary text-primary-foreground text-xs font-semibold shadow-xs hover:bg-primary/90 transition-colors"
                    >
                      Show All {searchCounts.rawTotal} Results in All Cinema
                    </button>
                  </div>
                ) : (
                  <p className="text-xs text-muted-foreground mt-1 max-w-sm mx-auto">
                    Try searching by a broader keyword, title, actor, or check your spelling.
                  </p>
                )}
              </div>
            )}
          </div>
        ) : (
          /* Catalog Feeds (Shown when no search active) */
          loading ? (
            <div className="flex flex-col items-center justify-center py-24 gap-3 text-muted-foreground text-xs">
              <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
              <span>Loading media catalog...</span>
            </div>
          ) : (
            <>
              {activeTab === 'home' && (
                <>
                  <ContentSection
                    title="Trending Movies"
                    subtitle="Most popular titles this week"
                    items={filteredTrendingMovies}
                    onSelect={setSelectedItem}
                    layout="scroll"
                  />

                  <ContentSection
                    title="Trending TV Series"
                    subtitle="Popular shows and seasons"
                    items={filteredTrendingSeries}
                    onSelect={setSelectedItem}
                    layout="scroll"
                  />

                  {cinemaMode !== 'hollywood' && latestBollyMovies.length > 0 && (
                    <ContentSection
                      title="Latest Bollywood"
                      subtitle="Hindi movies in HD & 4K"
                      items={latestBollyMovies}
                      onSelect={setSelectedItem}
                      layout="scroll"
                    />
                  )}

                  {cinemaMode !== 'bollywood' && animeItems.length > 0 && (
                    <ContentSection
                      title="Popular Anime"
                      subtitle="Anime series and films"
                      items={animeItems}
                      onSelect={setSelectedItem}
                      layout="scroll"
                    />
                  )}

                  <ContentSection
                    title="Explore Catalog"
                    subtitle={`Browsing ${stats?.total || 19689} items`}
                    items={filteredMixedItems}
                    onSelect={setSelectedItem}
                    layout="grid"
                  />
                </>
              )}

              {activeTab === 'trending' && (
                <div className="my-6">
                  <ContentSection
                    title="Trending Movies"
                    items={filteredTrendingMovies}
                    onSelect={setSelectedItem}
                    layout="grid"
                  />
                  <ContentSection
                    title="Trending Series"
                    items={filteredTrendingSeries}
                    onSelect={setSelectedItem}
                    layout="grid"
                  />
                </div>
              )}

              {activeTab === 'movies' && (
                <div className="my-6">
                  <ContentSection
                    title="All Movies"
                    subtitle="Hollywood & Bollywood"
                    items={allMoviesList}
                    onSelect={setSelectedItem}
                    layout="grid"
                  />
                </div>
              )}

              {activeTab === 'series' && (
                <div className="my-6">
                  <ContentSection
                    title="All Series"
                    subtitle="TV Series & Web Shows"
                    items={allSeriesList}
                    onSelect={setSelectedItem}
                    layout="grid"
                  />
                </div>
              )}

              {activeTab === 'anime' && (
                <div className="my-6">
                  <ContentSection
                    title="Anime Collection"
                    subtitle="Japanese animation, subbed & dubbed"
                    items={animeItems}
                    onSelect={setSelectedItem}
                    layout="grid"
                  />
                </div>
              )}
            </>
          )
        )}
      </main>

      {/* Media Detail Modals */}
      {selectedItem && (
        isSeriesItem(selectedItem) ? (
          <SeriesDetailModal series={selectedItem} onClose={() => setSelectedItem(null)} />
        ) : (
          <MovieDetailsModal movie={selectedItem} onClose={() => setSelectedItem(null)} />
        )
      )}

      {/* Scroll to Top Action */}
      <ScrollToTop />

      {/* Mobile Bottom Navigation - Hidden when media modal is open */}
      {!selectedItem && (
        <BottomBar
          activeTab={activeTab}
          onTabChange={tab => {
            setActiveTab(tab);
            handleClearSearch();
          }}
          cinemaMode={cinemaMode}
          onCinemaModeChange={setCinemaMode}
        />
      )}

      {/* Progressive Web App Install & Offline Banners */}
      {!selectedItem && <PWAInstallBanner />}
    </div>
  );
};
