// This file can be replaced during build by using the `fileReplacements` array.
// `ng build --prod` replaces `environment.ts` with `environment.prod.ts`.

export const environment = {
  production: false,
  stremioApiBase: '/stremio-api', // Proxy para desarrollo
  realDebridApiBase: 'https://api.real-debrid.com/rest/1.0',
  apiTimeout: 10000,
  enableDebugMode: true
};