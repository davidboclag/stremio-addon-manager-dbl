import { Injectable, inject, computed } from '@angular/core';
import { PreferencesService, Language, LANGUAGES } from './preferences.service';
import { LanguageConfigService } from './language-config.service';
import { DebridService } from './debrid.service';
import {
  Addon,
  TorrentioConfig,
  CometConfig,
  MediaFusionConfig,
  JackettioConfig
} from '../types/addon-configs';
import { HttpClient } from '@angular/common/http';

// Tipado para la respuesta de aiolist-config.json
interface AiolistsConfig {
  config?: {
    tmdbLanguage?: string;
    customListNames?: Record<string, string>;
    [key: string]: unknown;
  };
  [key: string]: unknown;
}

interface AiolistsConfigResponse {
  aiolistsConfig?: AiolistsConfig;
}

@Injectable({
  providedIn: 'root'
})
export class AddonConfigService {
  private readonly preferences = inject(PreferencesService);
  private readonly debridService = inject(DebridService);
  private readonly http = inject(HttpClient);
  private readonly languageConfig = inject(LanguageConfigService);

  // Configuración base de addons
  private readonly baseAddons: Addon[] = [
    {
      name: "watchhub",
      url: "https://watchhub.strem.io/manifest.json",
      hideTab: true,
    },
    {
      name: "Cinemeta",
      url: "https://v3-cinemeta.strem.io/manifest.json",
      hideTab: true,
    },
    {
      name: "Aiolists",
      getUrl: (token, language) => this.buildAiolistsUrl(language),
      requiresToken: false,
    },
    {
      name: "Animes' Season",
      url: "https://stremio-addons.com/animes-season.html",
    },
    {
      name: "Anime Kitsu",
      url: "https://anime-kitsu.strem.fun",
    },
    {
      name: "Torrentio",
      getUrl: (token, language) => this.buildTorrentioUrl(token, language),
      requiresToken: false,
    },
    {
      name: "Comet",
      getUrl: (token, language) => this.buildCometUrl(token, language),
      requiresToken: false,
    },
    {
      name: "MediaFusion",
      getUrl: async (token, language) => this.buildMediaFusionUrl(token, language),
      requiresToken: false,
    },
    {
      name: "Peerflix",
      getUrl: (token, language) => this.buildPeerflixUrl(token, language),
      requiresToken: false,
    },
    {
      name: "Jackettio",
      getUrl: (token, language) => this.buildJackettioUrl(token, language),
      requiresToken: false,
    },
    {
      name: "ThePirateBay+",
      url: "https://thepiratebay-plus.strem.fun",
    },
    {
      name: "Nuvio",
      url: "https://nuviostreams.hayd.uk/providers=showbox,vidzee,vidsrc,mp4hydra,uhdmovies,moviesmod,4khdhub,dramadrip,topmovies/min_qualities=%7B%22showbox%22%3A%22480p%22%2C%22vidsrc%22%3A%22480p%22%2C%22mp4hydra%22%3A%22480p%22%2C%22uhdmovies%22%3A%22720p%22%2C%22moviesmod%22%3A%22720p%22%2C%224khdhub%22%3A%22720p%22%2C%22dramadrip%22%3A%22720p%22%2C%22topmovies%22%3A%22720p%22%7D/configure",
    },
    {
      name: "Webstreamr",
      url: "https://webstreamr.hayd.uk/%7B%22en%22%3A%22on%22%2C%22es%22%3A%22on%22%2C%22mediaFlowProxyUrl%22%3A%22%22%2C%22mediaFlowProxyPassword%22%3A%22%22%2C%22proxyConfig%22%3A%22%22%7D/configure",
    },
    {
      name: "SubHero",
      getUrl: async (token, language) => {
        const langConfig = this.getLanguageConfig(language);
        // Obtener selección de idiomas del usuario (si no hay, usar el código del idioma actual)
        let selectedCodes: string[] = [];
        try {
          const prefs = this.preferences.selectedSubheroLanguages && this.preferences.selectedSubheroLanguages();
          if (Array.isArray(prefs) && prefs.length > 0) selectedCodes = prefs;
        } catch (e) {
          // ignore and fallback
        }

        // Mapear códigos a los que SubHero espera si existe subheroCode
        const mapped = (selectedCodes.length ? selectedCodes : [langConfig.code]).map(code => {
          const entry = Object.values(LANGUAGES).find(l => l.code === code);
          return entry ? (entry.subheroCode || entry.code) : code;
        });

        const codes = mapped.join(',');
        const payload = JSON.stringify({ language: codes });
        return `https://subhero.onrender.com/${encodeURIComponent(payload)}/configure`;
      }
    }
  ];

  /**
   * Helper function para acceso seguro a configuración de idioma
   */
  private getLanguageConfig(language?: string) {
    const lang = (language as Language) || this.preferences.selectedLanguage();
    return this.languageConfig.getConfig(lang);
  }

  // Computed para obtener la lista completa de addons
  readonly addons = computed(() => this.baseAddons);

  // Lista de addons considerados "de anime"
  readonly animeAddons = ['Anime Kitsu', "Animes' Season"];

  /**
   * Construye la URL de configuración para Aiolists
   */
  private async buildAiolistsUrl(language?: string): Promise<string> {
    const langConfig = this.getLanguageConfig(language);
    // Primero obtenemos la configuración de src/assets/aiolist-config.json
    const configAiolist = await this.http
      .get<AiolistsConfigResponse>(`/assets/aiolist-config.json`)
      .toPromise();
    if (!configAiolist || typeof configAiolist.aiolistsConfig !== 'object') {
      throw new Error('No se pudo cargar la configuración base de Aiolists');
    }
    const aiolistsConfig = configAiolist.aiolistsConfig;
    // Cambia idioma base de TMDB
    if (aiolistsConfig.config) {
      aiolistsConfig.config.tmdbLanguage = langConfig.code;
      // Si existe una traducción para ese idioma, añádela como bloque de traducción personalizado
      if (langConfig.aiolistsCodeList && aiolistsConfig[langConfig.aiolistsCodeList]) {
        const customLangBlock = aiolistsConfig[langConfig.aiolistsCodeList];
        if (
          typeof customLangBlock === 'object' &&
          customLangBlock !== null &&
          'customListNames' in customLangBlock &&
          typeof (customLangBlock as any).customListNames === 'object'
        ) {
          aiolistsConfig.config.customListNames = (customLangBlock as { customListNames: Record<string, string> }).customListNames;
        }
      }
    }
    // Ejecuta un post a https://aiolists.elfhosted.com/api/config/create con el body de aiolistsConfig y obtiene un configHash
    try {
      const response = await this.http.post<{ configHash?: string }>('https://aiolists.elfhosted.com/api/config/create', aiolistsConfig).toPromise();
      const configHash = response && response.configHash;
      if (!configHash) throw new Error('No se pudo obtener el configHash');
      return `https://aiolists.elfhosted.com/${configHash}/configure`;
    } catch (error) {
      console.error('Error al crear la configuración de Aiolists:', error);
      throw error;
    }
  }

  /**
   * Construye la URL de configuración para Torrentio
   */
  private buildTorrentioUrl(token?: string, language?: string): string {
    const langConfig = this.getLanguageConfig(language);
    const hasValidToken = token && this.debridService.validateTokenFormat(token);
    const currentService = this.debridService.currentService();

    // Si no hay servicio seleccionado, usar configuración básica sin debrid
    if (!currentService) {
      const config: TorrentioConfig = {
        sort: 'qualitysize',
        language: langConfig.torrentioCode,
        qualityFilter: ['threed', '480p', 'other', 'scr', 'cam', 'unknown'],
        limit: 5,
        debridOptions: undefined,
        realdebrid: undefined,
        alldebrid: undefined,
        premiumize: undefined,
        debridlink: undefined,
        torbox: undefined
      };
      return this.buildTorrentioUrlFromConfig(config);
    }

    const config: TorrentioConfig = {
      sort: 'qualitysize',
      language: langConfig.torrentioCode,
      qualityFilter: ['threed', '480p', 'other', 'scr', 'cam', 'unknown'],
      limit: 5,
      debridOptions: hasValidToken ? ['nocatalog'] : undefined,
      // Usar el nombre del servicio dinámicamente
      [currentService.name]: hasValidToken ? token : undefined
    };

    return this.buildTorrentioUrlFromConfig(config);
  }

  /**
   * Helper function para construir URLs de Torrentio de forma tipada
   */
  private buildTorrentioUrlFromConfig(config: TorrentioConfig): string {
    const baseUrl = 'https://torrentio.strem.fun';
    const params: string[] = [];

    if (config.sort) params.push(`sort=${config.sort}`);
    if (config.language) params.push(`language=${config.language}`);
    if (config.qualityFilter.length > 0) params.push(`qualityfilter=${config.qualityFilter.join(',')}`);
    if (config.limit) params.push(`limit=${config.limit}`);
    if (config.debridOptions && config.debridOptions.length > 0) params.push(`debridoptions=${config.debridOptions.join(',')}`);

    // Manejar dinámicamente cualquier servicio debrid
    if (config.realdebrid) params.push(`realdebrid=${config.realdebrid}`);
    if (config.alldebrid) params.push(`alldebrid=${config.alldebrid}`);
    if (config.premiumize) params.push(`premiumize=${config.premiumize}`);
    if (config.debridlink) params.push(`debridlink=${config.debridlink}`);
    if (config.torbox) params.push(`torbox=${config.torbox}`);

    return `${baseUrl}/${params.join('%7C')}/configure`;
  }

  /**
   * Construye la URL de configuración para Comet
   */
  private buildCometUrl(token?: string, language?: string): string {
    const langConfig = this.getLanguageConfig(language);
    const base64Original =
      "eyJtYXhSZXN1bHRzUGVyUmVzb2x1dGlvbiI6NSwibWF4U2l6ZSI6MCwiY2FjaGVkT25seSI6ZmFsc2UsInJlbW92ZVRyYXNoIjp0cnVlLCJyZXN1bHRGb3JtYXQiOlsiYWxsIl0sImRlYnJpZFNlcnZpY2UiOiJyZWFsZGVicmlkIiwiZGVicmlkQXBpS2V5IjoiIiwiZGVicmlkU3RyZWFtUHJveHlQYXNzd29yZCI6IiIsImxhbmd1YWdlcyI6eyJleGNsdWRlIjpbXSwicHJlZmVycmVkIjpbImVzIl19LCJyZXNvbHV0aW9ucyI6eyJyNDgwcCI6ZmFsc2UsInIzNjBwIjpmYWxzZSwidW5rbm93biI6ZmFsc2V9LCJvcHRpb25zIjp7InJlbW92ZV9yYW5rc191bmRlciI6LTEwMDAwMDAwMDAwLCJhbGxvd19lbmdsaXNoX2luX2xhbmd1YWdlcyI6ZmFsc2UsInJlbW92ZV91bmtub3duX2xhbmd1YWdlcyI6ZmFsc2V9fQ==";

    let cometConfig: CometConfig = JSON.parse(atob(base64Original));
    cometConfig.languages.preferred = [langConfig.cometCode];

    const hasValidToken = token && this.debridService.validateTokenFormat(token);
    if (hasValidToken) {
      cometConfig.debridApiKey = token;
      cometConfig.debridService = this.debridService.getServiceNameForAddon();
    }

    return `https://comet.elfhosted.com/${btoa(JSON.stringify(cometConfig))}/configure`;
  }

  /**
   * Construye la URL de configuración para MediaFusion
   */
  private async buildMediaFusionUrl(token?: string, language?: string): Promise<string> {
    const langConfig = this.getLanguageConfig(language);
    const hasValidToken = token && this.debridService.validateTokenFormat(token);

    const payload: MediaFusionConfig = {
      streaming_provider: hasValidToken
        ? {
          token: token,
          service: this.debridService.getServiceNameForAddon(),
          enable_watchlist_catalogs: false,
          download_via_browser: false,
          only_show_cached_streams: false,
        }
        : null,
      selected_catalogs: [],
      selected_resolutions: ["4k", "2160p", "1440p", "1080p", "720p"],
      enable_catalogs: false,
      enable_imdb_metadata: false,
      max_size: "inf",
      max_streams_per_resolution: "10",
      torrent_sorting_priority: [
        { key: "language", direction: "desc" },
        { key: "cached", direction: "desc" },
        { key: "resolution", direction: "desc" },
        { key: "quality", direction: "desc" },
        { key: "size", direction: "desc" },
        { key: "seeders", direction: "desc" },
        { key: "created_at", direction: "desc" },
      ],
      show_full_torrent_name: true,
      show_language_country_flag: true,
      nudity_filter: ["Disable"],
      certification_filter: ["Disable"],
      language_sorting: langConfig.mediafusionPriority,
      quality_filter: ["BluRay/UHD", "WEB/HD", "DVD/TV/SAT"],
      api_password: null,
      mediaflow_config: null,
      rpdb_config: null,
      live_search_streams: false,
      contribution_streams: false,
      mdblist_config: null,
    };

    try {
      const response = await fetch(
        "https://mediafusion.elfhosted.com/encrypt-user-data",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(payload),
        }
      );

      const data = await response.json();
      if (data.status === "success" && data.encrypted_str) {
        return `https://mediafusion.elfhosted.com/${data.encrypted_str}/configure`;
      } else {
        console.error(data);
        throw new Error("Error al generar la configuración de MediaFusion");
      }
    } catch (err) {
      console.error(err);
      throw new Error("Error de conexión al configurar MediaFusion");
    }
  }

  /**
   * Construye la URL de configuración para Peerflix
   */
  private buildPeerflixUrl(token?: string, language?: string): string {
    const langConfig = this.getLanguageConfig(language);
    const langParam = langConfig.peerflixCode || 'en';
    const currentService = this.debridService.currentService();

    // Si no hay servicio, devolver URL básica sin debrid
    if (!currentService) {
      return `https://addon.peerflix.mov/language=${langParam}%7Cqualityfilter=unknown,screener,vhs,sd,480p,540p,threed%7Csort=quality-desc,language-desc,size-desc/configure`;
    }

    return token && this.debridService.isValidToken()
      ? `https://addon.peerflix.mov/language=${langParam}%7Cqualityfilter=unknown,screener,vhs,sd,480p,540p,threed%7Cdebridoptions=nocatalog%7C${currentService.name}=${token}%7Csort=quality-desc,language-desc,size-desc/configure`
      : `https://addon.peerflix.mov/language=${langParam}%7Cqualityfilter=unknown,screener,vhs,sd,480p,540p,threed%7Csort=quality-desc,language-desc,size-desc/configure`;
  }

  /**
   * Construye la URL de configuración para Jackettio
   */
  private buildJackettioUrl(token?: string, language?: string): string {
    const langConfig = this.getLanguageConfig(language);
    const base64Original =
      "ewogICJtYXhUb3JyZW50cyI6IDUsCiAgInByaW9yaXRpemVQYWNrVG9ycmVudHMiOiAyLAogICJleGNsdWRlS2V5d29yZHMiOiBbImNhbSIsICJzY3JlZW5lciJdLAogICJkZWJyaWRJZCI6ICIiLAogICJoaWRlVW5jYWNoZWQiOiBmYWxzZSwKICAic29ydENhY2hlZCI6IFsKICAgIFsicXVhbGl0eSIsIHRydWVdLAogICAgWyJzaXplIiwgdHJ1ZV0KICBdLAogICJzb3J0VW5jYWNoZWQiOiBbCiAgICBbInF1YWxpdHkiLCB0cnVlXSwKICAgIFsic2VlZGVycyIsIHRydWVdCiAgXSwKICAiZm9yY2VDYWNoZU5leHRFcGlzb2RlIjogZmFsc2UsCiAgInByaW9yaXRpemVMYW5ndWFnZXMiOiBbInNwYW5pc2giXSwKICAiaW5kZXhlclRpbWVvdXRTZWMiOiA2MCwKICAibWV0YUxhbmd1YWdlIjogIiIsCiAgImVuYWJsZU1lZGlhRmxvdyI6IGZhbHNlLAogICJtZWRpYWZsb3dQcm94eVVybCI6ICIiLAogICJtZWRpYWZsb3dBcGlQYXNzd29yZCI6ICIiLAogICJtZWRpYWZsb3dQdWJsaWNJcCI6ICIiLAogICJ1c2VTdHJlbVRocnUiOiB0cnVlLAogICJzdHJlbXRocnVVcmwiOiAiaHR0cDovL2VsZmhvc3RlZC1pbnRlcm5hbC5zdHJlbXRocnUiLAogICJxdWFsaXRpZXMiOiBbNzIwLCAxMDgwLCAyMTYwXSwKICAiaW5kZXhlcnMiOiBbImV6dHYiLCAidGhlcGlyYXRlYmF5IiwgInl0cyJdLAogICJkZWJyaWRBcGlLZXkiOiAiIgogIH0=";

    let jackettioConfig: JackettioConfig = JSON.parse(atob(base64Original));
    jackettioConfig.priotizeLanguages = [langConfig.jackettioCode || 'spanish'];

    const hasValidToken = token && this.debridService.validateTokenFormat(token);
    if (hasValidToken) {
      jackettioConfig.debridApiKey = token;
      jackettioConfig.debridId = this.debridService.getServiceNameForAddon();
    } else {
      jackettioConfig.debridId = "realdebrid";
      jackettioConfig.debridApiKey = "";
    }

    return `https://jackettio.elfhosted.com/${btoa(JSON.stringify(jackettioConfig))}/configure`;
  }

  /**
   * Resuelve la URL final de un addon para instalación
   */
  async resolveAddonUrl(addon: Addon, token?: string, language?: string): Promise<string | null> {
    if (addon.name === 'Anime Kitsu') {
      return 'https://anime-kitsu.strem.fun/manifest.json';
    } else if (addon.name === "Animes' Season") {
      return 'https://victorgveloso.github.io/animes-season-addon/manifest.json';
    } else if (addon.name === 'ThePirateBay+') {
      return 'https://thepiratebay-plus.strem.fun/manifest.json';
    } else {
      if (addon.url) {
        return addon.url.replace('/configure', '/manifest.json');
      } else if (typeof addon.getUrl === 'function') {
        try {
          const generated = await addon.getUrl(token, language);
          return generated ? generated.replace('/configure', '/manifest.json') : null;
        } catch (error) {
          console.error(`Error generating URL for ${addon.name}:`, error);
          return null;
        }
      }
    }
    return null;
  }

  /**
   * Obtiene los addons filtrados por un preset específico
   */
  getAddonsByPreset(presetAddonNames: string[]): Addon[] {
    return this.addons().filter(addon => presetAddonNames.includes(addon.name));
  }

  /**
   * Obtiene los addons efectivos incluyendo addons de anime o Cinemeta según flags
   */
  getEffectiveAddons(presetAddonNames: string[], includeAnime: boolean, includeCinemeta: boolean = true): Addon[] {
    let addonNames = [...presetAddonNames];

    if (includeAnime) {
      addonNames = [...addonNames, ...this.animeAddons];
    }

    // Control explícito para incluir/excluir Cinemeta
    const cinemetaName = 'Cinemeta';
    if (includeCinemeta) {
      if (!addonNames.includes(cinemetaName)) addonNames.push(cinemetaName);
    } else {
      addonNames = addonNames.filter(n => n !== cinemetaName);
    }

    return this.addons().filter(addon => addonNames.includes(addon.name));
  }
}