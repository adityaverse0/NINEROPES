import { MediaItem, ParsedLink, SeasonPackage, SeasonZipItem, StatsResponse } from '../types';

const API_BASE_URL = (import.meta.env?.VITE_API_BASE_URL as string) || 'https://api.hicine.biz';
const API_SECRET_KEY = (import.meta.env?.VITE_API_KEY as string) || 'hicine_website_secret_2025_exi9epdmrns';

const DEFAULT_HEADERS: HeadersInit = {
  'Accept': 'application/json',
  'Content-Type': 'application/json',
  'x-api-key': API_SECRET_KEY,
};

async function fetchJson<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
  const url = endpoint.startsWith('http') ? endpoint : `${API_BASE_URL}${endpoint}`;
  const response = await fetch(url, {
    ...options,
    headers: {
      ...DEFAULT_HEADERS,
      ...options.headers,
    },
  });

  if (!response.ok) {
    throw new Error(`API Error [${response.status}]: ${response.statusText}`);
  }

  return response.json();
}

export const api = {
  // Stats
  async getStats(): Promise<StatsResponse> {
    return fetchJson<StatsResponse>('/rpc/stats');
  },

  // Feeds
  async getMixed(limit = 60): Promise<MediaItem[]> {
    const data = await fetchJson<any[]>(`/rpc/mixed?limit=${limit}`);
    return (data || []).map(item => item.source_table && item.data ? { ...item.data, source_table: item.source_table } : item);
  },

  async getTrendingMovies(limit = 30): Promise<MediaItem[]> {
    return fetchJson<MediaItem[]>(`/rpc/trending/movies?limit=${limit}`);
  },

  async getTrendingSeries(limit = 30): Promise<MediaItem[]> {
    return fetchJson<MediaItem[]>(`/rpc/trending/series?limit=${limit}`);
  },

  async getTrendingAll(limit = 30): Promise<MediaItem[]> {
    return fetchJson<MediaItem[]>(`/rpc/trending/all?limit=${limit}`);
  },

  async getLatestBollywoodMovies(limit = 30): Promise<MediaItem[]> {
    return fetchJson<MediaItem[]>(`/rpc/latest/bollywood/movies?limit=${limit}`);
  },

  async getLatestBollywoodSeries(limit = 30): Promise<MediaItem[]> {
    return fetchJson<MediaItem[]>(`/rpc/latest/bollywood/series?limit=${limit}`);
  },

  async getAnime(limit = 30): Promise<MediaItem[]> {
    return fetchJson<MediaItem[]>(`/rpc/anime?limit=${limit}`);
  },

  async getCategoryContent(category: string, limit = 30): Promise<MediaItem[]> {
    return fetchJson<MediaItem[]>(`/rpc/category/${encodeURIComponent(category)}?limit=${limit}`);
  },

  // Search
  async search(query: string): Promise<MediaItem[]> {
    const trimmed = query?.trim();
    if (!trimmed) return [];

    const seenIds = new Set<string>();
    const results: MediaItem[] = [];

    const addItem = (raw: any) => {
      if (!raw) return;
      const item: MediaItem = raw.source_table && raw.data ? { ...raw.data, source_table: raw.source_table } : raw;
      const id = String(item._id || item.record_id || item.url_slug || item.title);
      if (id && !seenIds.has(id)) {
        seenIds.add(id);
        results.push(item);
      }
    };

    // 1. Primary: RPC Search Endpoint
    try {
      const rpcData = await fetchJson<any[]>(`/rpc/search/${encodeURIComponent(trimmed)}`);
      if (Array.isArray(rpcData)) {
        rpcData.forEach(addItem);
      }
    } catch (err) {
      console.warn('RPC search error:', err);
    }

    // 2. Secondary fallback / complement: REST Search Endpoint
    if (results.length < 5) {
      try {
        const apiData = await fetchJson<any[]>(`/api/search/${encodeURIComponent(trimmed)}?limit=50`);
        if (Array.isArray(apiData)) {
          apiData.forEach(addItem);
        }
      } catch (err) {
        console.warn('API search fallback error:', err);
      }
    }

    return results;
  },

  // Details by MongoDB ID
  async getMovieDetails(id: string): Promise<MediaItem | null> {
    try {
      return await fetchJson<MediaItem>(`/api/movies/${id}`);
    } catch {
      return null;
    }
  },

  async getSeriesDetails(id: string): Promise<MediaItem | null> {
    try {
      return await fetchJson<MediaItem>(`/api/series/${id}`);
    } catch {
      return null;
    }
  },

  // Multi-server Link Parser for Movies
  parseMovieLinks(linksText?: string): ParsedLink[] {
    if (!linksText || typeof linksText !== 'string') return [];
    const SERVER_NAMES = ['PixelDrain', 'FSL', 'Mega', 'VCloud', 'Filexpress', 'GDtot', 'G-Direct'];
    const lines = linksText.split('\n').map(l => l.trim()).filter(Boolean);

    return lines.map(line => {
      const parts = line.split(', ').map(p => p.trim());
      const servers: { name: string; url: string }[] = [];

      for (let i = 0; i < 7; i++) {
        const url = parts[i];
        if (url && url.startsWith('http')) {
          servers.push({
            name: SERVER_NAMES[i] || `Server ${i + 1}`,
            url,
          });
        }
      }

      const description = parts[7] || parts[0] || 'Direct Download';
      const size = parts[8] || (description.match(/\b\d+(\.\d+)?\s*(MB|GB)\b/i)?.[0]) || 'Unknown Size';

      const qualityMatch = description.match(/\b(480p|720p|1080p|2160p|4k|uhd)\b/i);
      const quality = qualityMatch ? qualityMatch[0].toUpperCase() : 'Standard HD';

      return {
        quality,
        size,
        description,
        url: servers[0]?.url || parts[0] || '',
        servers,
        isMultiServer: servers.length > 0,
      };
    });
  },

  // Parse Series Season text into episodes
  parseSeriesSeason(seasonText?: string): Array<{ episode: string; url: string; size: string; quality: string }> {
    if (!seasonText || typeof seasonText !== 'string') return [];
    const lines = seasonText.split('\n').map(l => l.trim()).filter(Boolean);
    const episodes: Array<{ episode: string; url: string; size: string; quality: string }> = [];

    lines.forEach(line => {
      if (line.toLowerCase().includes('episode')) {
        const parts = line.split(':');
        const epName = parts[0]?.trim() || 'Episode';
        const rest = parts.slice(1).join(':').trim();
        const urlMatch = rest.match(/https?:\/\/[^\s,]+/);
        const sizeMatch = rest.match(/\b\d+(\.\d+)?\s*(MB|GB)\b/i);
        const qualityMatch = line.match(/\b(480p|720p|1080p|2160p|4k)\b/i);

        if (urlMatch) {
          episodes.push({
            episode: epName,
            url: urlMatch[0],
            size: sizeMatch ? sizeMatch[0] : 'N/A',
            quality: qualityMatch ? qualityMatch[0].toUpperCase() : '720P',
          });
        }
      }
    });

    return episodes;
  },

  // Verified REA Season ZIP Parser: handles season_zip, season_zip_cloud, and season_X_cloud
  parseSeasonPackages(item: MediaItem): SeasonPackage[] {
    const packagesMap = new Map<number, SeasonZipItem[]>();

    // Helper to add item to a season
    const addPackage = (seasonNum: number, pkg: SeasonZipItem) => {
      if (!packagesMap.has(seasonNum)) {
        packagesMap.set(seasonNum, []);
      }
      const existing = packagesMap.get(seasonNum)!;
      // Avoid duplicates
      if (!existing.some(e => e.url === pkg.url)) {
        existing.push(pkg);
      }
    };

    // 1. Parse season_zip (Standard mirrors / PixelDrain / VCloud / Worker ZIP packs - verified REA xA logic)
    if (item.season_zip && typeof item.season_zip === 'string') {
      try {
        const lines = item.season_zip.split(/\r?\n/).map(l => l.trim()).filter(Boolean);
        lines.forEach(line => {
          const seasonMatch = line.match(/^Season\s+(\d+)\s*:\s*(.+)/i);
          let seasonNum = 1;
          let content = line;
          if (seasonMatch) {
            seasonNum = parseInt(seasonMatch[1], 10);
            content = seasonMatch[2];
          }

          // Segments split by " : " as identified in REA decompiler
          const segments = content.split(/\s+:\s+/).map(s => s.trim()).filter(Boolean);
          segments.forEach(seg => {
            const m = seg.match(/\[([^\]]+)\]|(https?:\/\/[^\s,]+)/);
            if (m) {
              const rawUrl = m[1] || m[2];
              const cleanUrl = rawUrl.split('?')[0] + (rawUrl.includes('?') ? '?' + rawUrl.split('?')[1].split(',')[0] : '');
              const rest = seg.replace(/\[[^\]]+\]/, '').replace(/https?:\/\/[^\s,]+/, '');

              // Original REA matching regex
              const p = rest.match(/,([^,]*(?:p|bit|K|Season)[^,]*),([^,\n\r]+)/i) || rest.match(/,([^,]*),([^,\n\r]+)/);
              let rawQuality = 'Package';
              let rawSize = 'ZIP Pack';

              if (p) {
                rawQuality = p[1].trim() || 'Package';
                rawSize = p[2].trim() || 'Unknown';
              } else {
                const qMatch = rest.match(/(480p|720p|1080p|4K|2160p|Season)/i);
                if (qMatch) rawQuality = qMatch[1];
                const sMatch = rest.match(/(\d+(?:\.\d+)?\s*(?:MB|GB|KB))/i);
                if (sMatch) rawSize = sMatch[1];
              }

              // Determine exact quality and size
              let finalQuality = rawQuality;
              let finalSize = rawSize;

              // If size contains resolution indicator (e.g. "480p")
              if (/^\d+p$/i.test(rawSize)) {
                finalQuality = rawSize;
                const sizeInQ = rawQuality.match(/(\d+(?:\.\d+)?\s*(?:MB|GB|KB))/i);
                finalSize = sizeInQ ? sizeInQ[1] : 'ZIP Pack';
              } else {
                const qMatch = rest.match(/\b(480p|720p|1080p|2160p|4k|10bit)\b/i);
                if (qMatch) finalQuality = qMatch[0];
                const sMatch = rest.match(/(\d+(?:\.\d+)?\s*(?:MB|GB|KB))/i);
                if (sMatch) finalSize = sMatch[1];
              }

              addPackage(seasonNum, {
                quality: finalQuality.toUpperCase(),
                size: finalSize,
                url: cleanUrl,
                name: `Season ${seasonNum} Package (${finalQuality.toUpperCase()})`,
                isCloud: false,
              });
            }
          });
        });
      } catch (err) {
        console.error('Error parsing season_zip:', err);
      }
    }

    // 2. Parse season_zip_cloud (High-speed Cloud packages)
    if (item.season_zip_cloud && typeof item.season_zip_cloud === 'string') {
      try {
        const lines = item.season_zip_cloud.split(/\r?\n/).map(l => l.trim()).filter(Boolean);
        lines.forEach(line => {
          const seasonMatch = line.match(/^Season\s+(\d+)\s*:\s*(.+)/i);
          let seasonNum = 1;
          let content = line;
          if (seasonMatch) {
            seasonNum = parseInt(seasonMatch[1], 10);
            content = seasonMatch[2];
          }

          const segments = content.split(/\s*:\s*(?=https?:\/\/)/).map(s => s.trim()).filter(Boolean);
          segments.forEach(seg => {
            const urlMatch = seg.match(/https?:\/\/[^\s,]+/);
            if (urlMatch) {
              const url = urlMatch[0];
              const qualityMatch = seg.match(/,\s*(\d+p|4k)/i);
              const sizeMatch = seg.match(/\b\d+(\.\d+)?\s*(MB|GB)\b/i);
              const quality = qualityMatch ? qualityMatch[1].toUpperCase() : 'Cloud ZIP';
              const size = sizeMatch ? sizeMatch[0] : '10Gbps Cloud';

              addPackage(seasonNum, {
                quality: `${quality} Cloud`,
                size,
                url,
                name: `Season ${seasonNum} Cloud ZIP (${quality})`,
                isCloud: true,
              });
            }
          });
        });
      } catch (err) {
        console.error('Error parsing season_zip_cloud:', err);
      }
    }

    // 3. Check individual season_X_cloud fields
    for (let i = 1; i <= 25; i++) {
      const cloudUrl = item[`season_${i}_cloud`];
      if (cloudUrl && typeof cloudUrl === 'string' && cloudUrl.startsWith('http')) {
        addPackage(i, {
          quality: '10Gbps Cloud',
          size: 'Full Season',
          url: cloudUrl,
          name: `Season ${i} Cloud Package`,
          isCloud: true,
        });
      }
    }

    // Convert map to sorted array of SeasonPackage
    const result: SeasonPackage[] = [];
    const sortedSeasons = Array.from(packagesMap.keys()).sort((a, b) => a - b);

    sortedSeasons.forEach(num => {
      const pkgs = packagesMap.get(num)!;
      result.push({
        seasonNumber: num,
        seasonTitle: `Season ${num}`,
        packages: pkgs,
      });
    });

    return result;
  }
};
