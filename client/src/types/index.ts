export type CinemaMode = 'all' | 'hollywood' | 'bollywood';
export type ViewTab = 'home' | 'trending' | 'movies' | 'series' | 'anime';

export interface ServerOption {
  name: string;
  url: string;
}

export interface ParsedLink {
  quality: string;
  size: string;
  description: string;
  url: string;
  servers: ServerOption[];
  isMultiServer: boolean;
}

export interface SeasonZipItem {
  quality: string;
  size: string;
  url: string;
  name: string;
  isCloud: boolean;
}

export interface SeasonPackage {
  seasonNumber: number;
  seasonTitle: string;
  packages: SeasonZipItem[];
}

export interface MediaItem {
  _id: string;
  record_id?: number;
  title: string;
  featured_image?: string;
  poster?: string | null;
  categories?: string;
  status?: string;
  url_slug?: string;
  date?: string;
  modified_date?: string;
  links?: string;
  cloudlinks?: string | null;
  content?: {
    description?: string;
    duration?: string;
  } | null;
  excerpt?: string | null;
  source_table?: string;
  contentType?: 'movies' | 'series' | 'anime';
  cinemaType?: 'hollywood' | 'bollywood';
  // Series specific
  season_zip?: string | null;
  season_zip_cloud?: string | null;
  seasons?: Record<string, string>;
  [key: `season_${number}`]: string | undefined;
  [key: `season_${number}_cloud`]: string | undefined;
}

export interface StatsResponse {
  bollywood_movies: number;
  bollywood_series: number;
  hollywood_movies: number;
  hollywood_series: number;
  anime: number;
  total: number;
}
