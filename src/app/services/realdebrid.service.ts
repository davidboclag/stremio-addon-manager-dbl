import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { lastValueFrom } from 'rxjs';

@Injectable({ providedIn: 'root' })
export class RealDebridService {
    private base = 'https://api.real-debrid.com/rest/1.0';

    constructor(private http: HttpClient) { }

    saveToken(token: string) {
        localStorage.setItem('rd_token', token);
    }

    getToken(): string | null {
        return localStorage.getItem('rd_token');
    }

    removeToken() {
        localStorage.removeItem('rd_token');
    }

    async validateToken(token: string) {
        const headers = new HttpHeaders({ Authorization: `Bearer ${token}` });
        return lastValueFrom(this.http.get<any>(`${this.base}/user`, { headers }));
    }

    // --- Funciones de apertura de addons con token ---

    async abrirCometConToken(token: string) {
        const baseUrl = 'https://comet.strem.io/install';
        const url = `${baseUrl}?token=${token}`;
        window.open(url, '_blank');
    }

    async abrirJackettioConToken(token: string) {
        const baseUrl = 'https://jackettio.strem.io/install';
        const url = `${baseUrl}?token=${token}`;
        window.open(url, '_blank');
    }

    async configurarMediaFusion(token: string) {
        const baseUrl = 'https://mediafusion.strem.io/install';
        const payload = btoa(JSON.stringify({ token })); // base64 payload
        const url = `${baseUrl}?data=${payload}`;
        window.open(url, '_blank');
    }

    
}
