import { Injectable } from '@angular/core';

@Injectable({ providedIn: 'root' })
export class LocalStorageService {
  getNumber(key: string, defaultValue = 0): number {
    if (typeof localStorage === 'undefined') {
      return defaultValue;
    }

    const raw = localStorage.getItem(key);
    if (raw === null) {
      return defaultValue;
    }

    const parsed = Number(raw);
    return Number.isFinite(parsed) ? parsed : defaultValue;
  }

  setNumber(key: string, value: number): void {
    if (typeof localStorage === 'undefined') {
      return;
    }

    localStorage.setItem(key, String(value));
  }
}
