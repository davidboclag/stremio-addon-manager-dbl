// standalone service file (not decorated) but providedIn root via provideInRoot in providers arrays
import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { lastValueFrom } from 'rxjs';
import { environment } from '../../environments/environment';

@Injectable({ providedIn: 'root' })
export class StremioService {
  private base = environment.stremioApiBase;

  constructor(private http: HttpClient) { }

  async login(email: string, password: string) {
    const body = { authKey: null, email, password };
    return lastValueFrom(this.http.post<{ result?: any }>(`${this.base}/login`, body));
  }

  async getAddonCollection(authKey: string) {
    const body = { type: 'AddonCollectionGet', authKey, update: true };
    return lastValueFrom(this.http.post<any>(`${this.base}/addonCollectionGet`, body));
  }

  async setAddonCollection(payload: any) {
    // payload must be shaped as in original: { type: 'AddonCollectionSet', authKey, addons: [...] }
    return lastValueFrom(this.http.post<any>(`${this.base}/addonCollectionSet`, payload));
  }
}
