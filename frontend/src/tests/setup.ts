import '@testing-library/jest-dom/vitest';

class MemoryStorage implements Storage {
  private store: Record<string, string> = {};

  get length(): number {
    return Object.keys(this.store).length;
  }

  clear(): void {
    this.store = {};
  }

  getItem(key: string): string | null {
    return Object.prototype.hasOwnProperty.call(this.store, key) ? this.store[key] : null;
  }

  key(index: number): string | null {
    const keys = Object.keys(this.store);
    return keys[index] || null;
  }

  removeItem(key: string): void {
    delete this.store[key];
  }

  setItem(key: string, value: string): void {
    this.store[key] = String(value);
  }
}

const localMem = new MemoryStorage();
const sessionMem = new MemoryStorage();

Object.defineProperty(globalThis, 'localStorage', {
  value: localMem,
  writable: true,
  configurable: true,
});

Object.defineProperty(globalThis, 'sessionStorage', {
  value: sessionMem,
  writable: true,
  configurable: true,
});

if (typeof window !== 'undefined') {
  Object.defineProperty(window, 'localStorage', {
    value: localMem,
    writable: true,
    configurable: true,
  });
  Object.defineProperty(window, 'sessionStorage', {
    value: sessionMem,
    writable: true,
    configurable: true,
  });
}

// Mock global fetch for OAuth token refresh in unit test environment
const originalFetch = globalThis.fetch;
globalThis.fetch = async (input: RequestInfo | URL, init?: RequestInit) => {
  const url = String(input);
  if (url.includes('/oauth2/token') && init?.body) {
    const bodyStr = String(init.body);
    const isDonante = bodyStr.includes('5RaF_uAummcYjCA7LflK');
    const isAuditor = bodyStr.includes('sblUmCwhFmLuHMH175l6');
    const role = isDonante ? 'DONANTE' : isAuditor ? 'AUDITOR' : 'GESTOR';
    const sub = isDonante
      ? '419be540-0081-70f2-11e4-dfe2dc29491e'
      : isAuditor
      ? 'd15b8510-9091-703c-ed9d-947ebf355072'
      : '212b35b0-f011-706a-2882-0edd0f1c0550';
    const email = isDonante
      ? 'challenger_donante_a@aqp-solidaria.org'
      : isAuditor
      ? 'challenger_auditor@aqp-solidaria.org'
      : 'challenger_gestor@aqp-solidaria.org';

    const makeJwt = (payloadObj: Record<string, unknown>) => {
      const b64 = Buffer.from(JSON.stringify(payloadObj)).toString('base64url');
      return `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.${b64}.mock`;
    };

    return {
      ok: true,
      status: 200,
      json: async () => ({
        access_token: makeJwt({
          sub,
          'cognito:groups': [role],
          exp: 9999999999,
          scope: 'api/donations.write api/projects.write openid profile api/audit.read email api/donations.read',
        }),
        id_token: makeJwt({
          sub,
          'cognito:groups': [role],
          exp: 9999999999,
          email,
        }),
        expires_in: 900,
      }),
      text: async () => '',
    } as any;
  }
  return originalFetch ? originalFetch(input, init) : ({} as any);
};
