import { Component, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { StremioService } from '../../services/stremio.service';
import { RealDebridService } from '../../services/realdebrid.service';
import { AddonsComponent } from '../addons/addons.component';
import { AddonTabsComponent } from '../addons/addons-tabs.component';
import { HttpClient } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import { environment } from '../../../environments/environment';

interface Addon {
  name: string;
  hideTab?: boolean;
  requiresToken?: boolean;
  url?: string;
  transportName?: string;
  transportUrl?: string;
  getUrl?: (token?: string) => string | Promise<string>;
}

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [CommonModule, FormsModule, AddonsComponent, AddonTabsComponent],
  templateUrl: './dashboard.component.html',
})
export class DashboardComponent implements OnInit {
  token = '';
  isLoading = false;
  progressText = '';

  http = inject(HttpClient);

  addons: Addon[] = [
    // {
    //   name: "cinemeta",
    //   url: "https://v3-cinemeta.strem.io/manifest.json",
    //   hideTab: true, // <--- ocultar tab
    // },
    {
      name: "watchhub",
      url: "https://watchhub.strem.io/manifest.json",
      hideTab: true, // <--- ocultar tab}
    },
    {
      name: "Aiolists",
      // URL original tal cual
      url: "https://aiolists.elfhosted.com/H4sIAAAAAAAAA7UbXXLiPPIqlF4XT0H-dsZvJEwSsgPMBDIJmUptCVtgTfzDSnYIpHKR7w7f0x5hLrYlWzK2JGOx5TwlanVL6la7u9XdvAG4wv9CG2AD0AZk5c57Yhx3rAVByGJA0AZx4M7PESSITKNnFAIboM2NN79y8BjfDO62g-4I33z5xIDu_Q8G9B6v7l5HwY-T8f3d8TAYHA-ns9NR3_89m94G4-nX9ezo0Zv9PvfGkwEdBKf4EQ_OhlOnM-ovt-P-j81ocnI6nD6vh_3e67eLm617P8BjPDga93vr4f3sdTxdbmfbR380nR3Ptu7zePrzeXT1FTPc2dGX9ePDEI99imcP56uH4xt_dv8DP0zW2A1-bpwj_2XO9nvofHq9vLGmQ-clmJ59WwweOlfzfnj6cHnx2__P0XjrPV5PF9ECXV1OvDsuiAmiFEfhwM3kxkA9x4mSMC6C7igiIQxQBglQDF0Yw0mUEIfBGArH_AbDZQKXDIoogxH4HPccB1EqpC2gt2hBEPVk8NfXFSaI9mJgh4nvc2j5BD6m8Zi4iAD7FwjcORsnxP93HK2sbocdsQAjKHRxuLTCaG1RL1rT8rwPY0Rjy8VLHEPfIshHkCI9UvyiW4HtGkQvGFErWlixh6w1Qs9lnBDFCx-_cjz9nGZpF9MQbbRUfEpDBAO4jUJrRXCAtKQlBM0CXuInWsJ0Qkcwj6rAumW4sFaQwICpmrXyEwnFmVML-r4FU9WRjr9a-YjdhZY3PilBnRhHoQRzX1AYJ6RCRiEOoErkRAFyNxKMyVG6nMhJAhTGkEi4LoEBLIMWMMC-_o4XMIwh1c95mMaRvLwXERIRSdobGiOiX4REAQwd6fDUwdYCSzruEez7SFp6DQl4agMf0vhu5cIYMZtx1Dk6tbodq9udHh3bp6f2ydGn05POI_9u6ZCbD2C_AYijFGatYex47F_rnsE9SIfZce0F9ClqM8gk1TABYJteeMh53m3aOWObds_Ypp0vnz6fdR7B-3sbeNh1UfiNbQTsX09tQFAQvSC3AHESGkcBA4xgwLZ9M7ERNvjzlx_jANLWd-T_-dtJfCjrkaxlNuhlEEUNSndtg8sU8OdvuPc6bTDEDICjag20QV-MfFXFitrHdg2wj6U9uV21wY7L1hSFLgodBVU1tzaYIIJRJYlsXAtSzQiNzG3pcC5q-bA1QQEMpc0kQ2yDUQaovMCydd7h645WNtc26KfjyqVLJjzH1i2sM-k26KXQ1ncGrVZA1dhLlLoNiy7ABteJn1RuUHAKHFO74M4X2OD6fFy9XO5LMjzdYnoHYoPvAvCPyuUlx1Ki0UpecjY26DFIa_qzeo_cBxWRtYtnbskGPcfBf_4rO6jcBdmgx_7X4HB_ZIML9o_8ZWWeyQYX7K9EmXkiG_RVjyRciw2u0__kZbmXscG1xt0Il2KD2z3OxQYXODUFrUus4z33NzaYVroeG1wliBAI3llQSpa5RX97FxZ9yIQy3ayQMOvvbYCDVURi5PZcNworTP3OGL0BzBzM3mCQR6bf0onW9Gdrwif2-bGYJKgNMB32z9mx74g_SA8mZviOaRxeGX8W4uIlJBuHwPUiIu7S2aFM_GSpXSLerNjBfgGaqebTu5GdVQVSGQDzk02jVSsTQ2u8aE091LrP5gviyXhWvLyZeOoicHMpVa6UCyudlWUlexVVRsoDgJ9HuJOhgDclk6oXh7kslBXMZFD53cjvHEkCTX8zFc-qw_k3_F4k56_yLz_m-Cm4229cASrejub8ywvsv_5yMFPJvXT5IuZp-O71j-ODWTe8eW10pkpA_y7nBypFZI3rwt6UgLlY9Mvs1wtd_FkjG0lHysFqw5qyLxfyfwrGUGsqH5WVEYcmR1WOPM79pHULN63bHUJTGlSbJisI6xmSuPTwKocgmjX2q1DpMaJKp5yu4mdIHyKNf0fazJi5mpTJDZiu_F5Kmbgiy01_H7qU34EMG34PxReihuFiLlEwPI8-4Io1ScsCw9SDSQjjZxzSblflt0hcc7-7d66eW_l251Hzl6vmbQ-42wJxzdVWvNdVvqsyw_xEhbd64_dek5QuqgBedj__87MikKoV9uuBnJBQhaLkwlVpNK0YVel3AykopHXBk5xg0QQHSsJfRAZ5dqX5iKmqyFAUgY8D6uFtqMYDCnVNkJRnjKq517HdeDSkVE8K7EIXBhGdRyREHdX0FUjrbpxnvTSsijKNYFSMG7tVqQ50QIQnKGsuUkn3a7hUC0-CXzHzAfpcWe0qyIDgLUELHzkxVQWgLlAjil36UiODQnlNMF8ANca1WsUzZbdAWWPAeQpWY7hFsZDvdyHGTbEnVyPN1TmnrOEtSyBrWOM1T8EZHzbGWLmkegBfnLAmV5HlvjVJCp4MF9kJPmwsJVPOtR-Qj-CE-9mSS4gqf0pBmW-f1Ro_IAlVVcE2_AoV8pqYmhcmNAG1qFSIaFqMG3s2SKWQA-JoQbmfN7nuqwme5UI_33-YwT8gZK7oLDC8XIV8vwDywpLK-a6NgW-7Kz01xavSKWHI5I5uP3eiLqYyl7dj8N0mDrYucYOsyf0e5qqbU-7nbVfM09SOdtU9US3aQRqrDyklxAMqQjvaGqdS7LjQuJZSS5BwMCVgY25G131kqK9l2hpzK-rEGnubdycJg5sDGrO4cgPUASY3J93PYFpkVplj4Jyxe9ikpmZLH8xQRlYXHZQ6fXTBQbkRLY8NGPgjQgNt35txZFCmrrFAvIFJX7tOW0YLtep03GRtutiTashfTlbDmKbdSsOkrgdWMMznWqNo3Xg-YV_zrakgdEuoGYb3NqARib8TtEAEhU6m4rt7p-kJAa85uKANoqyBGLiIOqyDRC_KejpNx4gxka74Y3DSys6Melq1U8Gc5gD-9FW_A-kOOaNSfTcmOeB0UiHKkOCQDUo1EDP8A5avzMPXk6ppaoPLVFO75kSG2Hku0QBXk5szoCqmsQzklGeDDHBFdsVAV8vBpQGBSHHUoyqBgQmJnGkw0NVdtGiAnL_kDbRaeRnX0xQek_XIu7eZgW0uvHXqsXmAWYeYGSs499EVCgm6xH7MZjN_i0I2cQtDN2tgv0SQKXnuuUk6I7w1d7qZ8_SidYwDdNI9A201xPRxCOkqITjEaUzg-ml35VMbUASJ42W__0lXcnCI2M-C-K-AGE7WkDmRMJ-yDwpl8K_p0d1CRHURhSFy0h8S5G2ZO07YD7g41-k2YiL9iVA-SlY0htTj4_f3_wEPCzzbGzYAAA/configure",
    },
    {
      name: "Torrentio (RD)",
      getUrl: (token) =>
        token
          ? `https://torrentio.strem.fun/sort=qualitysize%7Clanguage=spanish%7Cqualityfilter=threed,480p,other,scr,cam,unknown%7Climit=5%7Cdebridoptions=nocatalog%7Crealdebrid=${token}/configure`
          : `https://torrentio.strem.fun/sort=qualitysize%7Clanguage=spanish%7Cqualityfilter=threed,480p,other,scr,cam,unknown%7Climit=5/configure`,
      requiresToken: false,
    },
    {
      name: "Comet (RD)",
      getUrl: (token) => {
        // base64 original EXACTO (NO RECORTADO)
        const base64Original =
          "eyJtYXhSZXN1bHRzUGVyUmVzb2x1dGlvbiI6NSwibWF4U2l6ZSI6MCwiY2FjaGVkT25seSI6ZmFsc2UsInJlbW92ZVRyYXNoIjp0cnVlLCJyZXN1bHRGb3JtYXQiOlsiYWxsIl0sImRlYnJpZFNlcnZpY2UiOiJyZWFsZGVicmlkIiwiZGVicmlkQXBpS2V5IjoiIiwiZGVicmlkU3RyZWFtUHJveHlQYXNzd29yZCI6IiIsImxhbmd1YWdlcyI6eyJleGNsdWRlIjpbXSwicHJlZmVycmVkIjpbImVzIl19LCJyZXNvbHV0aW9ucyI6eyJyNDgwcCI6ZmFsc2UsInIzNjBwIjpmYWxzZSwidW5rbm93biI6ZmFsc2V9LCJvcHRpb25zIjp7InJlbW92ZV9yYW5rc191bmRlciI6LTEwMDAwMDAwMDAwLCJhbGxvd19lbmdsaXNoX2luX2xhbmd1YWdlcyI6ZmFsc2UsInJlbW92ZV91bmtub3duX2xhbmd1YWdlcyI6ZmFsc2V9fQ==";
        let cometConfig = JSON.parse(atob(base64Original));
        cometConfig.debridApiKey = token;
        return `https://comet.elfhosted.com/${btoa(
          JSON.stringify(cometConfig)
        )}/configure`;
      },
      requiresToken: false,
    },
    {
      name: "MediaFusion (RD)",
      getUrl: async (token) => {
        // Mantengo el payload EXACTO como en tu código original (sin recortar).
        const payload = {
          streaming_provider: token
            ? {
              token: token,
              service: "realdebrid",
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
          language_sorting: ["Spanish", "English", "Japanese"],
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
            alert(
              "❌ Error al generar la configuración de MediaFusion. Revise el token que puede ser incorrecto"
            );
            // Always return a string, even on error
            return "";
          }
        } catch (err) {
          console.error(err);
          alert("❌ Error de conexión al configurar MediaFusion.");
          // Always return a string, even on error
          return "";
        }
      },
      requiresToken: false,
    },
    {
      name: "Peerflix (RD)",
      getUrl: (token) =>
        token
          ? `https://addon.peerflix.mov/language=es,en%7Cqualityfilter=unknown,screener,vhs,sd,480p,540p,threed%7Cdebridoptions=nocatalog%7Crealdebrid=${token}%7Csort=quality-desc,language-desc,size-desc/configure`
          : `https://addon.peerflix.mov/language=es,en%7Cqualityfilter=unknown,screener,vhs,sd,480p,540p,threed%7Csort=quality-desc,language-desc,size-desc/configure`,
      requiresToken: false,
    },
    {
      name: "Jackettio (RD)",
      getUrl: (token) => {
        // base64 original EXACTO (NO RECORTADO)
        const base64Original =
          "eyJtYXhUb3JyZW50cyI6NSwicHJpb3RpemVQYWNrVG9ycmVudHMiOjIsImV4Y2x1ZGVLZXl3b3JkcyI6WyJjYW0iLCJzY3JlZW5lciJdLCJkZWJyaWRJZCI6InJlYWxkZWJyaWQiLCJoaWRlVW5jYWNoZWQiOmZhbHNlLCJzb3J0Q2FjaGVkIjpbWyJxdWFsaXR5Iix0cnVlXSxbInNpemUiLHRydWVdXSwic29ydFVuY2FjaGVkIjpbWyJxdWFsaXR5Iix0cnVlXSxbInNlZWRlcnMiLHRydWVdXSwiZm9yY2VDYWNoZU5leHRFcGlzb2RlIjpmYWxzZSwicHJpb3RpemVMYW5ndWFnZXMiOlsic3BhbmlzaCJdLCJpbmRleGVyVGltZW91dFNlYyI6NjAsIm1ldGFMYW5ndWFnZSI6IiIsImVuYWJsZU1lZGlhRmxvdyI6ZmFsc2UsIm1lZGlhZmxvd1Byb3h5VXJsIjoiIiwibWVkaWFmbG93QXBpUGFzc3dvcmQiOiIiLCJtZWRpYWZsb3dQdWJsaWNJcCI6IiIsInVzZVN0cmVtVGhydSI6dHJ1ZSwic3RyZW10aHJ1VXJsIjoiaHR0cDovL2VsZmhvc3RlZC1pbnRlcm5hbC5zdHJlbXRocnUiLCJxdWFsaXRpZXMiOls3MjAsMTA4MCwyMTYwXSwiaW5kZXhlcnMiOlsiZXp0diIsInRoZXBpcmF0ZWJheSIsInl0cyJdLCJkZWJyaWRBcGlLZXkiOiIzRDJXNzNRQ01RSDZDT1BCSktZRVlLRTVJSEw1UEVYVEVIRkZZQ1g0R1VKNUZHNDNCNkRBIn0=";
        let jackettioConfig = JSON.parse(atob(base64Original));
        jackettioConfig.debridApiKey = token;
        return `https://jackettio.elfhosted.com/${btoa(
          JSON.stringify(jackettioConfig)
        )}/configure`;
      },
      requiresToken: true,
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
      name: "Anime Kitsu",
      url: "https://anime-kitsu.strem.fun",
    },
    {
      name: "Webstreamr",
      url: "https://webstreamr.hayd.uk/%7B%22en%22%3A%22on%22%2C%22es%22%3A%22on%22%2C%22mediaFlowProxyUrl%22%3A%22%22%2C%22mediaFlowProxyPassword%22%3A%22%22%2C%22proxyConfig%22%3A%22%22%7D/configure",
    },
    {
      name: "Animes' Season",
      url: "https://stremio-addons.com/animes-season.html",
    },
  ];

  stremioAuthKey = '';
  iframeUrls: string[] = [];

  constructor(
    private router: Router,
    private rd: RealDebridService,
    private stremio: StremioService
  ) { }

  ngOnInit() {
    this.token = this.rd.getToken() || '';
    this.stremioAuthKey = localStorage.getItem('stremio_authkey') || '';
  }

  copyToken() {
    if (!this.token) return alert('No hay token');
    navigator.clipboard.writeText(this.token).then(() => alert('Token copiado'));
  }

  abrirComet() {
    if (!this.token) return alert('Introduce un token válido');
    this.rd.abrirCometConToken(this.token);
    this.iframeUrls.push(`https://comet.strem.io/install?token=${this.token}`);
  }

  abrirJackettio() {
    if (!this.token) return alert('Introduce un token válido');
    this.rd.abrirJackettioConToken(this.token);
    this.iframeUrls.push(`https://jackettio.strem.io/install?token=${this.token}`);
  }

  configurarMediaFusion() {
    if (!this.token) return alert('Introduce un token válido');
    this.rd.configurarMediaFusion(this.token);
    const payload = btoa(JSON.stringify({ token: this.token }));
    this.iframeUrls.push(`https://mediafusion.strem.io/install?data=${payload}`);
  }

  async configureAll() {
    if (!this.stremioAuthKey)
      return alert('⚠️ Debes iniciar sesión correctamente primero.');

    const confirmacion = confirm(
      '⚠️ ATENCIÓN: Si continúas, tu configuración actual de addons en Stremio será REEMPLAZADA por la recomendada.\n\n¿Deseas continuar?'
    );

    if (!confirmacion) return;

    const token = this.token.trim();
    if (token && !this.validarToken(token)) return alert('❌ Token inválido.');

    this.isLoading = true; // 🔹 ACTIVAR overlay
    this.progressText = 'Preparando instalación...';

    const finalJson: any[] = [];
    const totalAddons = this.addons.length;
    let currentIndex = 0;

    try {
      for (const addon of this.addons) {
        currentIndex++;
        this.progressText = `Descargando manifest ${currentIndex} de ${totalAddons} (${addon.name})...`;

        let url: string | null = null;

        if (addon.name === 'Anime Kitsu') {
          url = 'https://anime-kitsu.strem.fun/manifest.json';
        } else if (addon.name === "Animes' Season") {
          url = 'https://victorgveloso.github.io/animes-season-addon/manifest.json';
        } else if (addon.name === 'ThePirateBay+') {
          url = 'https://thepiratebay-plus.strem.fun/manifest.json';
        } else {
          if (addon.url) {
            url = addon.url.replace('/configure', '/manifest.json');
          } else if (typeof (addon as any).getUrl === 'function') {
            let generated = await (addon as any).getUrl(token);
            if (generated) url = generated.replace('/configure', '/manifest.json');
          }
        }

        if (!url) continue;

        let manifestObj: any = {};
        try {
          const response = await fetch(url);
          if (!response.ok) throw new Error(`HTTP ${response.status}`);
          manifestObj = await response.json();
        } catch (err: any) {
          manifestObj = { error: err.message };
        }

        const isOfficial = ['cinemeta', 'watchhub'].includes(
          addon.name?.toLowerCase() || ''
        );
        const flags = { official: isOfficial, protected: isOfficial };

        finalJson.push({
          transportUrl: url,
          name: addon.transportName,
          manifest: manifestObj,
          flags
        });
      }

      this.progressText = 'Enviando configuración a Stremio...';

      const collectionJson = {
        type: 'AddonCollectionSet',
        authKey: this.stremioAuthKey,
        addons: finalJson
      };

      const resp = await fetch(`${environment.stremioApiBase}/addonCollectionSet`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(collectionJson)
      });

      const data = await resp.json();

      if (data.result && data.result.success) {
        this.progressText = '✅ Configuración completada correctamente.';
        await new Promise((res) => setTimeout(res, 2000)); // pequeña pausa visual
        alert(
          '✅ Los addons han sido enviados y configurados correctamente en Stremio.'
        );
        this.reloadAddons();
      } else {
        this.progressText = '❌ Error al enviar los addons.';
        alert('❌ Error al enviar los addons a Stremio.');
      }
    } catch (err) {
      console.error(err);
      this.progressText = '❌ Error de conexión.';
      alert('❌ Error de conexión al enviar los addons a Stremio.');
    } finally {
      await new Promise((res) => setTimeout(res, 500)); // para transición suave
      this.isLoading = false; // 🔹 DESACTIVAR overlay siempre
      this.progressText = '';
    }
  }



  async resetStremio() {
    if (!this.stremioAuthKey) {
      alert('⚠️ Debes iniciar sesión correctamente primero.');
      return;
    }

    const confirmacion = confirm(
      '¿Seguro que deseas borrar tu configuración actual de Stremio y volver al estado de fábrica?'
    );
    if (!confirmacion) return;

    this.isLoading = true;
    this.progressText = 'Cargando configuración de fábrica...';

    try {
      // 🔹 Cargar JSON desde assets
      const fileContent: any = await firstValueFrom(
        this.http.get('/assets/reset-stremio.json')
      );

      // 🔹 Reemplazar dinámicamente authKey
      const payload = {
        ...fileContent,
        authKey: this.stremioAuthKey
      };

      this.progressText = 'Enviando configuración de fábrica a Stremio...';

      // 🔹 Enviar a la API
      const resp = await fetch(`${environment.stremioApiBase}/addonCollectionSet`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      const data = await resp.json();

      if (data.result && data.result.success) {
        this.progressText = '✅ Stremio reseteado correctamente.';
        await new Promise(res => setTimeout(res, 1500));
        alert('✅ Stremio ha sido reseteado a su configuración de fábrica.');
        this.reloadAddons();
      } else {
        this.progressText = '❌ Error al resetear Stremio.';
        alert('❌ Error al resetear Stremio.');
      }
    } catch (err) {
      console.error(err);
      this.progressText = '❌ Error de conexión.';
      alert('❌ Error de conexión al resetear Stremio.');
    } finally {
      await new Promise(res => setTimeout(res, 500));
      this.isLoading = false;
      this.progressText = '';
    }
  }


  validarToken(token: string): boolean {
    const regex = /^[A-Za-z0-9]{20,}$/;
    return regex.test(token);
  }



  logout() {
    localStorage.removeItem('stremio_authkey');
    this.router.navigate(['/']);
  }

  reloadAddons() {
    location.reload();
  }
}
