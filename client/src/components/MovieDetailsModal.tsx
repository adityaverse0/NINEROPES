import React, { useState, useEffect } from 'react';
import { MediaItem, ParsedLink } from '../types';
import { api } from '../services/api';
import { downloadManager } from '../services/downloadManager';
import { X, Download, Server, Copy, Check } from 'lucide-react';

interface MovieDetailsModalProps {
  movie: MediaItem;
  onClose: () => void;
}

export const MovieDetailsModal: React.FC<MovieDetailsModalProps> = ({ movie, onClose }) => {
  const [details, setDetails] = useState<MediaItem>(movie);
  const [loading, setLoading] = useState(false);
  const [parsedLinks, setParsedLinks] = useState<ParsedLink[]>([]);
  const [selectedQualityIndex, setSelectedQualityIndex] = useState(0);
  const [copiedUrl, setCopiedUrl] = useState<string | null>(null);
  const [downloadNotice, setDownloadNotice] = useState<string | null>(null);

  // Fetch full details if links aren't populated
  useEffect(() => {
    let isMounted = true;
    const fetchFull = async () => {
      if (movie.links) {
        setParsedLinks(api.parseMovieLinks(movie.links));
        return;
      }
      setLoading(true);
      try {
        const fullItem = await api.getMovieDetails(movie._id);
        if (isMounted && fullItem) {
          setDetails(fullItem);
          setParsedLinks(api.parseMovieLinks(fullItem.links));
        }
      } catch (err) {
        console.error('Failed to load movie details:', err);
      } finally {
        if (isMounted) setLoading(false);
      }
    };
    fetchFull();
    return () => { isMounted = false; };
  }, [movie]);

  // Lock body scroll
  useEffect(() => {
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = 'unset'; };
  }, []);

  const selectedLink = parsedLinks[selectedQualityIndex] || parsedLinks[0];

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

  return (
    <div 
      className="fixed inset-0 z-50 overflow-hidden bg-black/60 backdrop-blur-sm flex flex-col justify-end sm:justify-center sm:items-center p-0 sm:p-6 animate-fadeIn"
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
            <span className="text-xs font-semibold uppercase tracking-wider text-primary">Movie Details</span>
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
        <div className="overflow-y-auto overscroll-contain flex-1 pb-safe scrollbar-none">
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

              {details.excerpt && (
                <p className="text-xs text-muted-foreground mt-2 line-clamp-3 leading-relaxed hidden sm:block">
                  {details.excerpt}
                </p>
              )}

              {/* Quality Selectors */}
              {parsedLinks.length > 0 && (
                <div className="mt-3">
                  <span className="text-[11px] font-medium text-muted-foreground block mb-1">Select Quality</span>
                  <div className="flex flex-wrap gap-1.5">
                    {parsedLinks.map((link, idx) => (
                      <button
                        key={idx}
                        onClick={() => setSelectedQualityIndex(idx)}
                        className={`px-2.5 py-1 sm:px-3 sm:py-1.5 rounded-xl text-xs font-medium transition-all active:scale-95 ${
                          selectedQualityIndex === idx
                            ? 'bg-primary text-primary-foreground shadow-sm'
                            : 'bg-muted text-muted-foreground hover:text-foreground hover:bg-muted/80 border border-border'
                        }`}
                      >
                        <span>{link.quality}</span>
                        <span className="ml-1 opacity-70 text-[10px]">({link.size})</span>
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Excerpt on mobile */}
          {details.excerpt && (
            <div className="px-4 pb-2 sm:hidden">
              <p className="text-xs text-muted-foreground line-clamp-3 leading-relaxed">
                {details.excerpt}
              </p>
            </div>
          )}

          {/* Server Mirrors & Actions */}
          <div className="p-4 sm:p-6 border-t border-border bg-card">
            {loading ? (
              <div className="flex items-center justify-center py-6 gap-2 text-muted-foreground text-xs">
                <div className="w-4 h-4 border-2 border-primary border-t-transparent rounded-full animate-spin" />
                <span>Loading mirror servers...</span>
              </div>
            ) : selectedLink ? (
              <div>
                <div className="flex items-center justify-between gap-3 mb-3">
                  <div className="flex items-center gap-2">
                    <Server size={14} className="text-primary flex-shrink-0" />
                    <span className="text-xs font-semibold text-foreground">
                      Available Download Servers ({selectedLink.quality} - {selectedLink.size})
                    </span>
                  </div>
                </div>

                {/* Mirror server cards */}
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2">
                  {selectedLink.servers.length > 0 ? (
                    selectedLink.servers.map((srv, idx) => (
                      <div
                        key={idx}
                        className="flex items-center justify-between p-2.5 rounded-xl bg-muted/50 border border-border hover:border-primary/40 transition-colors"
                      >
                        <a
                          href={srv.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          onClick={() => {
                            setDownloadNotice(`Redirecting to ${srv.name}...`);
                            setTimeout(() => setDownloadNotice(null), 3000);
                          }}
                          className="flex-1 flex items-center gap-2 text-left truncate mr-2 group/btn cursor-pointer py-1"
                          title={`Open ${srv.name} mirror`}
                        >
                          <Download size={14} className="text-primary group-hover/btn:scale-110 transition-transform flex-shrink-0" />
                          <span className="text-xs font-medium text-foreground group-hover/btn:text-primary transition-colors truncate">
                            {srv.name}
                          </span>
                        </a>

                        {/* Copy link */}
                        <button
                          onClick={() => handleCopy(srv.url)}
                          className="p-2 rounded-lg hover:bg-muted text-muted-foreground hover:text-foreground transition-colors flex-shrink-0 active:scale-95"
                          title="Copy direct link"
                          aria-label="Copy link"
                        >
                          {copiedUrl === srv.url ? <Check size={14} className="text-green-500" /> : <Copy size={14} />}
                        </button>
                      </div>
                    ))
                  ) : (
                    <div className="col-span-full flex items-center justify-between p-3 rounded-xl bg-muted/50 border border-border">
                      <span className="text-xs text-foreground">Direct Download Link</span>
                      <a
                        href={selectedLink.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        onClick={() => {
                          setDownloadNotice('Redirecting to download mirror...');
                          setTimeout(() => setDownloadNotice(null), 3000);
                        }}
                        className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-primary hover:bg-primary/90 text-primary-foreground text-xs font-semibold transition-colors shadow-xs cursor-pointer active:scale-95"
                      >
                        <Download size={14} />
                        <span>Download</span>
                      </a>
                    </div>
                  )}
                </div>

                {/* Status notice */}
                {downloadNotice && (
                  <div className="mt-3 p-2 rounded-xl bg-primary/10 border border-primary/20 text-primary text-xs flex items-center gap-2">
                    <Check size={14} className="text-primary flex-shrink-0" />
                    <span>{downloadNotice}</span>
                  </div>
                )}
              </div>
            ) : (
              <p className="text-center py-4 text-xs text-muted-foreground">
                No download sources found for this movie.
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
