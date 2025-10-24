# 🧩 Integración de Aiolists con Angular y Configuración Multilenguaje

Este documento describe cómo se implementa la generación dinámica de configuraciones **Aiolists** en un proyecto **Angular**, sin backend, utilizando un fichero JSON local y compatibilidad multilenguaje.

---

## 📘 Índice

1. [Resumen del proyecto](#resumen-del-proyecto)  
2. [Estructura del JSON de configuración](#estructura-del-json-de-configuración)  
3. [Integración con Angular](#integración-con-angular)  
4. [Flujo completo de creación de configuración](#flujo-completo-de-creación-de-configuración)  
5. [Cómo funciona Aiolists internamente](#cómo-funciona-aiolists-internamente)  
6. [Ejemplo de URLs generadas](#ejemplo-de-urls-generadas)  
7. [Notas técnicas y recomendaciones](#notas-técnicas-y-recomendaciones)

---

## 🧠 Resumen del proyecto

El objetivo es permitir que los usuarios de tu sitio web:
- Instalen un **addon Aiolists preconfigurado**, con tus listas personalizadas.  
- Elijan un idioma (por ejemplo, *español*, *portugués*, *inglés*).  
- Reciban una configuración Aiolists dinámica y traducida según su idioma.  

Todo esto se logra **sin backend**, únicamente con Angular y un archivo JSON alojado en `/assets/`.

---

## 🗂️ Estructura del JSON de configuración

El archivo base `/src/assets/aiolist-config.json` define la configuración de listas y addons.

```json
{
  "aiolistsConfig": {
    "config": {
      "tmdbLanguage": "en",
      "metadataSource": "tmdb",
      "listOrder": ["mdblisturl_top-10"],
      "importedAddons": {
        "mdblisturl_top-10": {
          "id": "mdblisturl_top-10",
          "isMDBListUrlImport": true,
          "mdblistUsername": "rizreflects",
          "mdblistId": "top-10",
          "types": ["movie"]
        }
      },
      "customListNames": {
        "mdblisturl_top-10": "Top 10"
      }
    },
    "es-ES": {
      "customListNames": {
        "mdblisturl_top-10": "Top 10 Películas"
      }
    },
    "pt-BR": {
      "customListNames": {
        "mdblisturl_top-10": "Top 10 Filmes"
      }
    }
  }
}
```

### 🔍 Descripción de campos principales

| Campo | Descripción |
|--------|--------------|
| `tmdbLanguage` | Idioma usado para obtener metadatos (TMDB / Trakt). |
| `metadataSource` | Fuente de información principal (`tmdb` o `trakt`). |
| `importedAddons` | Addons o listas importadas de MDBList u otras fuentes. |
| `customListNames` | Nombres de las listas en el idioma base. |
| `es-ES`, `pt-BR` | Bloques opcionales con traducciones de nombres personalizados. |

---

## ⚙️ Integración con Angular

```ts
private async buildAiolistsUrl(language?: string): Promise<string> {
  const langConfig = this.getLanguageConfig(language);
  const configAiolist: any = await this.http.get('/assets/aiolist-config.json').toPromise();

  // Establece el idioma base
  configAiolist.aiolistsConfig.config.tmdbLanguage = langConfig.code;

  // Añade traducciones según el idioma seleccionado
  if (langConfig.code === 'es') {
    configAiolist.aiolistsConfig['es-ES'] = {
      customListNames: {
        'mdblisturl_top-10': 'Top 10 Películas'
      }
    };
  } else if (langConfig.code === 'pt') {
    configAiolist.aiolistsConfig['pt-BR'] = {
      customListNames: {
        'mdblisturl_top-10': 'Top 10 Filmes'
      }
    };
  }

  try {
    const response: any = await this.http
      .post('https://aiolists.elfhosted.com/api/config/create', configAiolist.aiolistsConfig)
      .toPromise();

    const configHash = response?.configHash;
    if (!configHash) throw new Error('No se pudo obtener el configHash');
    return `https://aiolists.elfhosted.com/${configHash}/configure`;
  } catch (error) {
    console.error('Error al crear la configuración de Aiolists:', error);
    throw error;
  }
}
```

---

## 🔁 Flujo completo de creación de configuración

1. El usuario selecciona un idioma desde la web.  
2. Angular obtiene el JSON base `/assets/aiolist-config.json`.  
3. Se ajusta `tmdbLanguage` y se agregan traducciones según el idioma.  
4. Se envía la configuración al endpoint:

   ```
   POST https://aiolists.elfhosted.com/api/config/create
   ```

5. El servidor Aiolists devuelve un `configHash`.  
6. Se construye la URL final del addon:

   ```
   https://aiolists.elfhosted.com/{configHash}/configure
   ```

7. El usuario abre ese enlace en Stremio y las listas aparecen **en su idioma**.

---

## 🧬 Cómo funciona Aiolists internamente

| Elemento | Función |
|-----------|----------|
| `config.tmdbLanguage` | Controla el idioma de los metadatos obtenidos. |
| `config.customListNames` | Define los nombres por defecto de las listas. |
| `es-ES.customListNames` / `pt-BR.customListNames` | Sobrescriben los nombres visibles según idioma. |
| `configHash` | Es una codificación comprimida de toda la configuración enviada. |

---

## 🌍 Ejemplo de URLs generadas

| Idioma | URL generada |
|--------|---------------|
| Español | `https://aiolists.elfhosted.com/H4sIAAAAA.../configure` |
| Portugués | `https://aiolists.elfhosted.com/H4sIAAAAA.../configure` |
| Inglés | `https://aiolists.elfhosted.com/H4sIAAAAA.../configure` |

---

## 🧾 Notas técnicas y recomendaciones

- `aiolist-config.json` puede contener tantas listas y traducciones como desees.  
- No es necesario un backend.  
- Si usas `ngx-translate`, puedes generar los bloques `customListNames` dinámicamente.  
- Usa códigos ISO estándar (`es-ES`, `pt-BR`, `en-US`).  
- Guarda el `configHash` si quieres enlaces persistentes.  

---

## ✅ En resumen

- Configuración totalmente **client-side**, sin servidor.  
- URLs dinámicas generadas por idioma.  
- Estructura multilenguaje compatible con Aiolists y Stremio.  
- Basado en `aiolist-config.json` centralizado.
