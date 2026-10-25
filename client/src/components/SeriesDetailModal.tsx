import React, { useState, useEffect } from 'react';
import { MediaItem, SeasonPackage } from '../types';
import { api } from '../services/api';
import { downloadManager } from '../services/downloadManager';
import { X, Download, Copy, Check, Tv, Package, List } from 'lucide-react';

interface SeriesDetailModalProps {
  series: MediaItem;
  onClose: () => void;
}

export const SeriesDetailModal: React.FC<SeriesDetailModalProps> = ({ series, onClose }) => {
  const [details, setDetails] = useState<MediaItem>(series);
  const [loading, setLoading] = useState(false);
  const [availableSeasons, setAvailableSeasons] = useState<number[]>([]);
  const [selectedSeason, setSelectedSeason] = useState<number>(1);
  const [episodes, setEpisodes] = useState<Array<{ episode: string; url: string; size: string; quality: string }>>([]);
  const [seasonPackages, setSeasonPackages] = useState<SeasonPackage[]>([]);
  const [activeTab, setActiveTab] = useState<'episodes' | 'packages'>('episodes');
  const [copiedUrl, setCopiedUrl] = useState<string | null>(null);
  const [downloadNotice, setDownloadNotice] = useState<string | null>(null);

  // Fetch full details if seasons or season_zip not populated
  useEffect(() => {
    let isMounted = true;
    const fetchDetails = async () => {
      // Check initial series object
      const initialPackages = api.parseSeasonPackages(series);
      setSeasonPackages(initialPackages);

      const seasonNums: number[] = [];
      for (let i = 1; i <= 25; i++) {
        if (series[`season_${i}`]) {
          seasonNums.push(i);
        }
      }

      if (seasonNums.length > 0 && series.season_zip) {
        setAvailableSeasons(seasonNums);
        setSelectedSeason(seasonNums[0]);
        setEpisodes(api.parseSeriesSeason(series[`season_${seasonNums[0]}`]));
        return;
      }

      setLoading(true);
      try {
        const full = await api.getSeriesDetails(series._id);
        if (isMounted && full) {
          setDetails(full);
          const pkgs = api.parseSeasonPackages(full);
          setSeasonPackages(pkgs);

          const fullSeasonNums: number[] = [];
          for (let i = 1; i <= 25; i++) {
            if (full[`season_${i}`]) {
              fullSeasonNums.push(i);
            }
          }

          if (fullSeasonNums.length === 0 && pkgs.length > 0) {
            pkgs.forEach(p => fullSeasonNums.push(p.seasonNumber));
          }

          setAvailableSeasons(fullSeasonNums);
          if (fullSeasonNums.length > 0) {
            setSelectedSeason(fullSeasonNums[0]);
            setEpisodes(api.parseSeriesSeason(full[`season_${fullSeasonNums[0]}`]));
          }
        }
      } catch (err) {
        console.error('Failed to load series details:', err);
      } finally {
        if (isMounted) setLoading(false);
      }
    };

    fetchDetails();
    return () => { isMounted = false; };
  }, [series]);

  // Update episodes when selectedSeason changes
  useEffect(() => {
    const seasonText = details[`season_${selectedSeason}`];
    if (seasonText) {
      setEpisodes(api.parseSeriesSeason(seasonText));
    } else {
      setEpisodes([]);
    }
  }, [selectedSeason, details]);

  // Lock body scroll
  useEffect(() => {
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = 'unset'; };
  }, []);

  const handleCopy = async (url: string) => {
    if (!url) return;
    const ok = await downloadManager.copyLink(url);
    if (ok) {
      setCopiedUrl(url);
      setTimeout(() => setCopiedUrl(null), 2500);
    }
  };

  const yearMatch = details.title.match(/\b(19\d{2}|20\d{2})\b/);
  const releaseYear = yearMatch ? yearMatch[0] : (details.date ? new Date(details.date).getFullYear() : null);

  const currentSeasonPackages = seasonPackages.find(p => p.seasonNumber === selectedSeason)?.packages || [];
  const totalZipCount = seasonPackages.reduce((acc, p) => acc + p.packages.length, 0);

  return (
    <div 
      className="fixed inset-0 z-[100] overflow-hidden bg-black/60 backdrop-blur-sm flex flex-col justify-end sm:justify-center sm:items-center p-0 sm:p-6 animate-fadeIn"
      onClick={onClose}
    >
      <div 
        className="relative w-full max-w-3xl bg-card text-card-foreground border-t sm:border border-border rounded-t-2xl sm:rounded-2xl shadow-2xl flex flex-col max-h-[92vh] sm:max-h-[85vh] overflow-hidden"
        onClick={e => e.stopPropagation()}
      >
        {/* Mobile handle indicator */}
        <div className="w-10 h-1 rounded-full bg-muted-foreground/30 mx-auto mt-2.5 mb-1 sm:hidden flex-shrink-0" />

        {/* Header bar */}
        <div className="flex items-center justify-between px-4 sm:px-6 py-3 sm:py-4 border-b border-border bg-card flex-shrink-0">
          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold uppercase tracking-wider text-primary">Series Details</span>
            {releaseYear && <span className="text-xs text-muted-foreground">• {releaseYear}</span>}
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-xl bg-muted hover:bg-muted/80 text-muted-foreground hover:text-foreground flex items-center justify-center transition-colors active:scale-95"
            aria-label="Close modal"
          >
            <X size={16} />
          </button>
        </div>

        {/* Scrollable Modal Body */}
        <div className="overflow-y-auto overscroll-contain flex-1 pb-8 sm:pb-6 pb-safe scrollbar-none">
          {/* Media Overview */}
          <div className="p-4 sm:p-6 flex flex-row gap-4 sm:gap-5">
            <div className="flex-shrink-0 w-24 sm:w-36 aspect-[2/3] rounded-xl overflow-hidden bg-muted border border-border shadow-sm">
              <img
                src={details.featured_image || 'https://images.unsplash.com/photo-1518709268805-4e9042af2176?w=400&fit=crop'}
                alt={details.title}
                loading="lazy"
                decoding="async"
                className="w-full h-full object-cover"
              />
            </div>

            <div className="flex-1 flex flex-col justify-start min-w-0">
              <h1 className="text-base sm:text-xl font-bold text-foreground tracking-tight leading-snug">
                {details.title}
              </h1>

              {details.categories && (
                <p className="text-[11px] sm:text-xs text-muted-foreground mt-1 line-clamp-2">
                  {details.categories.split(',').join(' • ')}
                </p>
              )}

              {/* Season Selector Tabs */}
              {availableSeasons.length > 0 && (
                <div className="mt-3">
                  <span className="text-[11px] font-medium text-muted-foreground block mb-1">Select Season</span>
                  <div className="flex flex-wrap gap-1.5">
                    {availableSeasons.map(num => (
                      <button
                        key={num}
                        onClick={() => setSelectedSeason(num)}
                        className={`px-2.5 py-1 sm:px-3 sm:py-1 rounded-xl text-xs font-medium transition-all active:scale-95 ${
                          selectedSeason === num
                            ? 'bg-primary text-primary-foreground shadow-sm'
                            : 'bg-muted text-muted-foreground hover:text-foreground border border-border'
                        }`}
                      >
                        Season {num}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* View Mode Tabs: Individual Episodes vs Full Season ZIPs */}
              <div className="flex items-center gap-1.5 mt-3 pt-2.5 border-t border-border flex-wrap">
                <button
                  onClick={() => setActiveTab('episodes')}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-medium transition-colors active:scale-95 ${
                    activeTab === 'episodes'
                      ? 'bg-muted text-foreground font-semibold'
                      : 'text-muted-foreground hover:text-foreground'
                  }`}
                >
                  <List size={14} />
                  <span>Episodes ({episodes.length})</span>
                </button>

                <button
                  onClick={() => setActiveTab('packages')}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-medium transition-colors active:scale-95 ${
                    activeTab === 'packages'
                      ? 'bg-primary text-primary-foreground shadow-sm'
                      : 'bg-muted/60 text-muted-foreground hover:text-foreground border border-border'
                  }`}
                >
                  <Package size={14} />
                  <span>Season ZIPs {totalZipCount > 0 ? `(${totalZipCount})` : ''}</span>
                </button>
              </div>
            </div>
          </div>

          {/* Tab 1: Season ZIP Packages Panel */}
          {activeTab === 'packages' && (
            <div className="p-4 sm:p-6 border-t border-border bg-card">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <Package size={15} className="text-primary flex-shrink-0" />
                  <span className="text-xs font-semibold text-foreground">
                    Complete Season ZIP Packages
                  </span>
                </div>
                <span className="text-[11px] text-muted-foreground">
                  Download entire season in 1 archive
                </span>
              </div>

              {loading ? (
                <div className="flex items-center justify-center py-6 gap-2 text-muted-foreground text-xs">
                  <div className="w-4 h-4 border-2 border-primary border-t-transparent rounded-full animate-spin" />
                  <span>Scanning season ZIP archives...</span>
                </div>
              ) : seasonPackages.length > 0 ? (
                <div className="space-y-3 max-h-72 overflow-y-auto scrollbar-none pr-1">
                  {seasonPackages.map(sp => (
                    <div key={sp.seasonNumber} className="bg-muted/40 border border-border rounded-xl p-3">
                      <h4 className="text-xs font-bold text-foreground mb-2 flex items-center gap-2">
                        <Tv size={13} className="text-primary" />
                        <span>{sp.seasonTitle} ZIP Packages</span>
                      </h4>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                        {sp.packages.map((pkg, idx) => (
                          <div
                            key={idx}
                            className="flex items-center justify-between p-2.5 rounded-xl bg-card border border-border hover:border-primary/40 transition-colors"
                          >
                            <div className="truncate mr-2">
                              <div className="text-xs font-semibold text-foreground truncate flex items-center gap-1.5">
                                <span className="truncate">{pkg.quality}</span>
                              </div>
                              <div className="text-[10px] text-muted-foreground mt-0.5">{pkg.size}</div>
                            </div>

                            <div className="flex items-center gap-1.5 flex-shrink-0">
                              {/* Direct Download Mirror */}
                              <a
                                href={pkg.url}
                                target="_blank"
                                rel="noopener noreferrer"
                                onClick={() => {
                                  setDownloadNotice(`Opening ${pkg.name}...`);
                                  setTimeout(() => setDownloadNotice(null), 3000);
                                }}
                                className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-primary hover:bg-primary/90 text-primary-foreground text-[11px] font-semibold transition-colors shadow-xs cursor-pointer active:scale-95"
                                title="Download Full Season ZIP"
                              >
                                <Download size={13} />
                                <span>ZIP</span>
                              </a>
                              {/* Copy Link */}
                              <button
                                onClick={() => handleCopy(pkg.url)}
                                className="p-1.5 rounded-lg hover:bg-muted text-muted-foreground hover:text-foreground transition-colors active:scale-95"
                                title="Copy ZIP Link"
                                aria-label="Copy link"
                              >
                                {copiedUrl === pkg.url ? <Check size={13} className="text-green-500" /> : <Copy size={13} />}
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-6 text-xs text-muted-foreground">
                  No season ZIP packages found for this title. You can download individual episodes below.
                </div>
              )}
            </div>
          )}

          {/* Tab 2: Individual Episodes Panel */}
          {activeTab === 'episodes' && (
            <div className="p-4 sm:p-6 border-t border-border bg-card">
              {/* Quick banner for current season's ZIP if available */}
              {currentSeasonPackages.length > 0 && (
                <div className="mb-3 p-2.5 rounded-xl bg-muted border border-border flex items-center justify-between gap-3">
                  <div className="flex items-center gap-2 truncate">
                    <Package size={15} className="text-primary flex-shrink-0" />
                    <div className="truncate">
                      <span className="text-xs font-semibold text-foreground">Season {selectedSeason} ZIP:</span>
                      <span className="text-xs text-muted-foreground ml-1.5 truncate">
                        {currentSeasonPackages.map(p => `${p.quality} (${p.size})`).join(' • ')}
                      </span>
                    </div>
                  </div>

                  <button
                    onClick={() => setActiveTab('packages')}
                    className="px-2.5 py-1 rounded-lg bg-primary hover:bg-primary/90 text-primary-foreground text-xs font-semibold flex-shrink-0 transition-colors shadow-xs active:scale-95"
                  >
                    ZIPs
                  </button>
                </div>
              )}

              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-semibold text-foreground">
                  Season {selectedSeason} Episodes ({episodes.length})
                </span>
              </div>

              {loading ? (
                <div className="flex items-center justify-center py-6 gap-2 text-muted-foreground text-xs">
                  <div className="w-4 h-4 border-2 border-primary border-t-transparent rounded-full animate-spin" />
                  <span>Loading season episodes...</span>
                </div>
              ) : episodes.length > 0 ? (
                <div className="space-y-1.5 max-h-72 overflow-y-auto scrollbar-none pr-1">
                  {episodes.map((ep, idx) => (
                    <div
                      key={idx}
                      className="flex items-center justify-between p-2.5 rounded-xl bg-muted/40 border border-border hover:border-primary/40 transition-colors gap-3"
                    >
                      <div className="flex items-center gap-2.5 truncate">
                        <span className="w-6 h-6 rounded-lg bg-muted text-muted-foreground text-[11px] font-medium flex items-center justify-center flex-shrink-0">
                          {idx + 1}
                        </span>
                        <div className="truncate">
                          <span className="text-xs font-medium text-foreground truncate block">
                            {ep.episode}
                          </span>
                          <span className="text-[10px] text-muted-foreground">
                            {ep.quality} • {ep.size}
                          </span>
                        </div>
                      </div>

                      <div className="flex items-center gap-1.5 flex-shrink-0">
                        <a
                          href={ep.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          onClick={() => {
                            setDownloadNotice(`Opening ${ep.episode}...`);
                            setTimeout(() => setDownloadNotice(null), 3000);
                          }}
                          className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-primary hover:bg-primary/90 text-primary-foreground text-xs font-medium transition-colors shadow-xs cursor-pointer active:scale-95"
                          title="Download Episode"
                        >
                          <Download size={13} />
                          <span>Download</span>
                        </a>

                        <button
                          onClick={() => handleCopy(ep.url)}
                          className="p-1.5 rounded-lg hover:bg-muted text-muted-foreground hover:text-foreground transition-colors active:scale-95"
                          title="Copy direct link"
                          aria-label="Copy link"
                        >
                          {copiedUrl === ep.url ? <Check size={13} className="text-green-500" /> : <Copy size={13} />}
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-center py-6 text-xs text-muted-foreground">
                  No episodes listed for Season {selectedSeason}.
                </p>
              )}
            </div>
          )}

          {/* Status notice */}
          {downloadNotice && (
            <div className="p-3 bg-card border-t border-border">
              <div className="p-2 rounded-xl bg-primary/10 border border-primary/20 text-primary text-xs flex items-center gap-2">
                <Check size={14} className="text-primary flex-shrink-0" />
                <span>{downloadNotice}</span>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
