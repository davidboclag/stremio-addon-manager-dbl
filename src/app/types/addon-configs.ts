/**
 * Interfaces para configuraciones de addons de Stremio
 * Tipado específico para cada addon que requiere configuración compleja
 */

// Interface para configuración de Jackettio
export interface JackettioConfig {
  maxTorrents: number;
  prioritizePackTorrents: number;
  excludeKeywords: string[];
  debridId: string;
  hideUncached: boolean;
  sortCached: [string, boolean][];
  sortUncached: [string, boolean][];
  forceCacheNextEpisode: boolean;
  priotizeLanguages: string[];
  indexerTimeoutSec: number;
  metaLanguage: string;
  enableMediaFlow: boolean;
  mediaflowProxyUrl: string;
  mediaflowApiPassword: string;
  mediaflowPublicIp: string;
  useStremThru: boolean;
  stremthruUrl: string;
  qualities: number[];
  indexers: string[];
  debridApiKey: string;
}

// Interface para configuración de Comet
export interface CometConfig {
  maxResultsPerResolution: number;
  maxSize: number;
  cachedOnly: boolean;
  removeTrash: boolean;
  resultFormat: string[];
  debridService: string;
  debridApiKey: string;
  debridStreamProxyPassword: string;
  languages: {
    exclude: string[];
    preferred: string[];
  };
  resolutions: {
    r480p: boolean;
    r360p: boolean;
    unknown: boolean;
  };
  options: {
    remove_ranks_under: number;
    allow_english_in_languages: boolean;
    remove_unknown_languages: boolean;
  };
}

// Interfaces para configuración de MediaFusion
export interface MediaFusionStreamingProvider {
  token: string;
  service: string;
  enable_watchlist_catalogs: boolean;
  download_via_browser: boolean;
  only_show_cached_streams: boolean;
}

export interface MediaFusionSortingPriority {
  key: string;
  direction: 'asc' | 'desc';
}

export interface MediaFusionConfig {
  streaming_provider: MediaFusionStreamingProvider | null;
  selected_catalogs: string[];
  selected_resolutions: string[];
  enable_catalogs: boolean;
  enable_imdb_metadata: boolean;
  max_size: string;
  max_streams_per_resolution: string;
  torrent_sorting_priority: MediaFusionSortingPriority[];
  show_full_torrent_name: boolean;
  show_language_country_flag: boolean;
  nudity_filter: string[];
  certification_filter: string[];
  language_sorting: string[];
  quality_filter: string[];
  api_password: string | null;
  mediaflow_config: any | null;
  rpdb_config: any | null;
  live_search_streams: boolean;
  contribution_streams: boolean;
  mdblist_config: any | null;
}

// Interface para configuración de Torrentio
export interface TorrentioConfig {
  sort: string;
  language: string;
  qualityFilter: string[];
  limit: number;
  debridOptions?: string[];
  realdebrid?: string;
}

// Interface base para addons
export interface Addon {
  name: string;
  hideTab?: boolean;
  requiresToken?: boolean;
  url?: string;
  transportName?: string;
  transportUrl?: string;
  getUrl?: (token?: string, language?: string) => string | Promise<string>;
}

// Tipos para configuraciones predefinidas
export type PresetType = 'basic' | 'complete' | 'premium' | 'streaming';

export interface AddonPreset {
  id: PresetType;
  name: string;
  description: string;
  icon: string;
  addonNames: string[];
  requiresToken?: boolean;
  benefits: string[];
}

// Configuraciones predefinidas disponibles
export const ADDON_PRESETS: Record<PresetType, AddonPreset> = {
  basic: {
    id: 'basic',
    name: 'Configuración Básica',
    description: 'Addons esenciales para uso general sin servicios premium',
    icon: '🎬',
    addonNames: ['watchhub', 'Torrentio', 'ThePirateBay+', 'Anime Kitsu'],
    requiresToken: false,
    benefits: [
      'Ideal para principiantes',
      'No requiere servicios premium',
      'Contenido básico de calidad'
    ]
  },
  complete: {
    id: 'complete',
    name: 'Configuración Completa',
    description: 'Todos los addons principales con funcionalidad completa',
    icon: '🎯',
    addonNames: ['watchhub', 'Torrentio', 'Comet', 'MediaFusion', 'Peerflix', 'ThePirateBay+', 'Nuvio', 'Anime Kitsu', 'Webstreamr'],
    requiresToken: false,
    benefits: [
      'Máxima cobertura de contenido',
      'Funciona sin y con Real-Debrid',
      'Ideal para usuarios avanzados'
    ]
  },
  premium: {
    id: 'premium',
    name: 'Configuración Premium',
    description: 'Addons optimizados para Real-Debrid con máxima calidad',
    icon: '💎',
    addonNames: ['watchhub', 'Aiolists', 'Torrentio', 'Comet', 'MediaFusion', 'Peerflix', 'Jackettio', 'ThePirateBay+', 'Nuvio', 'Anime Kitsu', 'Webstreamr', "Animes' Season"],
    requiresToken: true,
    benefits: [
      'Máxima calidad de video',
      'Enlaces premium garantizados',
      'Velocidad de descarga optimizada'
    ]
  },
  streaming: {
    id: 'streaming',
    name: 'Solo Streaming',
    description: 'Addons de streaming directo sin descargas',
    icon: '📺',
    addonNames: ['watchhub', 'Nuvio', 'Webstreamr', 'Anime Kitsu', "Animes' Season"],
    requiresToken: false,
    benefits: [
      'No requiere descargas',
      'Streaming instantáneo',
      'Menor uso de ancho de banda'
    ]
  }
};