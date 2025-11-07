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
  // Servicios debrid opcionales
  realdebrid?: string;
  alldebrid?: string;
  premiumize?: string;
  debridlink?: string;
  torbox?: string;
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
export type PresetType = 'basic' | 'complete' | 'premium' | 'recommended';

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
    name: 'PRESETS.BASIC.NAME',
    description: 'PRESETS.BASIC.DESCRIPTION',
    icon: '🎬',
    addonNames: ['Cinemeta', 'watchhub', 'Aiolists', 'Torrentio', 'Comet', 'SubHero'],
    requiresToken: false,
    benefits: [
      'PRESETS.BASIC.BENEFIT_1',
    ]
  },
  complete: {
    id: 'complete',
    name: 'PRESETS.COMPLETE.NAME',
    description: 'PRESETS.COMPLETE.DESCRIPTION',
    icon: '🎯',
    addonNames: ['Cinemeta', 'watchhub', 'Aiolists', 'Torrentio', 'Comet', 'MediaFusion', 'SubHero'],
    requiresToken: false,
    benefits: [
      'PRESETS.COMPLETE.BENEFIT_1',
    ]
  },
  premium: {
    id: 'premium',
    name: 'PRESETS.PREMIUM.NAME',
    description: 'PRESETS.PREMIUM.DESCRIPTION',
    icon: '💎',
    addonNames: ['Cinemeta', 'watchhub', 'Aiolists', 'Torrentio', 'Comet', 'MediaFusion', 'Peerflix', 'Jackettio', 'ThePirateBay+', 'Nuvio', 'Webstreamr', 'SubHero'],
    requiresToken: false,
    benefits: [
      'PRESETS.PREMIUM.BENEFIT_1',
      'PRESETS.PREMIUM.BENEFIT_2',
    ]
  },
  recommended: {
    id: 'recommended',
    name: 'PRESETS.RECOMMENDED.NAME',
    description: 'PRESETS.RECOMMENDED.DESCRIPTION',
    icon: '📺',
    addonNames: ['Cinemeta', 'watchhub', 'Aiolists', 'Torrentio', 'Comet', 'MediaFusion', 'Peerflix', 'Jackettio', 'ThePirateBay+', 'Nuvio', 'Webstreamr', 'SubHero'],
    requiresToken: true,
    benefits: [
      'PRESETS.RECOMMENDED.BENEFIT_1',
      'PRESETS.RECOMMENDED.BENEFIT_2',
      'PRESETS.RECOMMENDED.BENEFIT_3'
    ]
  }
};

// Tipos para servicios de debrid
export type DebridProviderType = 'realdebrid' | 'alldebrid' | 'premiumize' | 'debridlink' | 'easydebrid' | 'torbox' | null;

export interface DebridProviderConfig {
  id: DebridProviderType;
  name: string;
  displayName: string;
  icon: string;
  color: string;
  apiBaseUrl: string;
  tokenLength?: number;
  tokenPattern?: RegExp;
  authUrl: string;
  signupUrl: string;
  features: {
    streaming: boolean;
    downloads: boolean;
    torrents: boolean;
    usenet: boolean;
  };
}

export interface DebridUser {
  id: string | number;
  username: string;
  email?: string;
  premium?: boolean;
  expiration?: string;
}

export interface DebridValidationResult {
  valid: boolean;
  user?: DebridUser;
  error?: string;
}

// Configuración de servicios de debrid disponibles
export const DEBRID_SERVICES: Record<Exclude<DebridProviderType, null>, DebridProviderConfig> = {
  realdebrid: {
    id: 'realdebrid',
    name: 'realdebrid',
    displayName: 'Real-Debrid',
    icon: '🔴',
    color: '#4CAF50',
    apiBaseUrl: 'https://api.real-debrid.com/rest/1.0',
    tokenLength: 52,
    tokenPattern: /^[A-Za-z0-9]{52}$/,
    authUrl: 'https://real-debrid.com/devices',
    signupUrl: 'https://real-debrid.com',
    features: {
      streaming: true,
      downloads: true,
      torrents: true,
      usenet: false
    }
  },
  alldebrid: {
    id: 'alldebrid',
    name: 'alldebrid',
    displayName: 'AllDebrid',
    icon: '🟢',
    color: '#2196F3',
    apiBaseUrl: 'https://api.alldebrid.com/v4',
    tokenLength: 20,
    tokenPattern: /^[A-Za-z0-9]{20}$/,
    authUrl: 'https://alldebrid.com/apikeys',
    signupUrl: 'https://alldebrid.com',
    features: {
      streaming: true,
      downloads: true,
      torrents: true,
      usenet: true
    }
  },
  premiumize: {
    id: 'premiumize',
    name: 'premiumize',
    displayName: 'Premiumize',
    icon: '🟡',
    color: '#FF9800',
    apiBaseUrl: 'https://www.premiumize.me/api',
    tokenLength: 16,
    tokenPattern: /^[A-Za-z0-9]{16}$/,
    authUrl: 'https://www.premiumize.me/account',
    signupUrl: 'https://www.premiumize.me',
    features: {
      streaming: true,
      downloads: true,
      torrents: true,
      usenet: true
    }
  },
  debridlink: {
    id: 'debridlink',
    name: 'debridlink',
    displayName: 'Debrid-Link',
    icon: '🔵',
    color: '#673AB7',
    apiBaseUrl: 'https://debrid-link.com/api/v2',
    tokenLength: 35,
    tokenPattern: /^[A-Za-z0-9]{35}$/,
    authUrl: 'https://debrid-link.com/webapp/apikey',
    signupUrl: 'https://debrid-link.com',
    features: {
      streaming: true,
      downloads: true,
      torrents: true,
      usenet: true
    }
  },
  easydebrid: {
    id: 'easydebrid',
    name: 'easydebrid',
    displayName: 'EasyDebrid',
    icon: '🟣',
    color: '#E91E63',
    apiBaseUrl: 'https://easydebrid.com/api/v1',
    tokenLength: 16,
    tokenPattern: /^[A-Za-z0-9]{16}$/,
    authUrl: 'https://easydebrid.com/account',
    signupUrl: 'https://easydebrid.com',
    features: {
      streaming: true,
      downloads: true,
      torrents: true,
      usenet: false
    }
  },
  torbox: {
    id: 'torbox',
    name: 'torbox',
    displayName: 'TorBox',
    icon: '📦',
    color: '#FF5722',
    apiBaseUrl: 'https://api.torbox.app/v1/api',
    tokenLength: 36,
    tokenPattern: /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/,
    authUrl: 'https://torbox.app/settings',
    signupUrl: 'https://torbox.app',
    features: {
      streaming: true,
      downloads: true,
      torrents: true,
      usenet: true
    }
  }
};