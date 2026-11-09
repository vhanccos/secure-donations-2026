export const CLIENT_ID = import.meta.env.VITE_COGNITO_CLIENT_ID || '6qc17dq9iqpoqq8e4sk5doqpnn';
export const COGNITO_DOMAIN = import.meta.env.VITE_COGNITO_DOMAIN || 'https://aqp-solidaria-915275802786.auth.us-east-2.amazoncognito.com';
export const REDIRECT_URI = typeof window !== 'undefined' ? `${window.location.origin}/` : 'http://localhost:5173/';
export const ALL_SCOPES = 'openid email profile api/projects.write api/donations.write api/donations.read api/audit.read';

function generateRandomString(length: number): string {
  const possible = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-._~';
  const values = crypto.getRandomValues(new Uint8Array(length));
  return Array.from(values)
    .map((x) => possible[x % possible.length])
    .join('');
}

async function sha256(plain: string): Promise<ArrayBuffer> {
  const encoder = new TextEncoder();
  const data = encoder.encode(plain);
  return crypto.subtle.digest('SHA-256', data);
}

function base64UrlEncode(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer);
  let str = '';
  for (let i = 0; i < bytes.byteLength; i++) {
    str += String.fromCharCode(bytes[i]);
  }
  return btoa(str).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

export interface PkcePair {
  verifier: string;
  challenge: string;
}

export async function generatePkcePair(): Promise<PkcePair> {
  const verifier = generateRandomString(64);
  const hash = await sha256(verifier);
  const challenge = base64UrlEncode(hash);
  return { verifier, challenge };
}

export function buildCognitoAuthorizeUrl(challenge: string, state: string): string {
  // Use exact callback URL registered in Cognito (e.g. http://localhost:5173 without trailing slash or with, matching Cognito)
  const redirectUri = window.location.origin;
  const params = new URLSearchParams({
    response_type: 'code',
    client_id: CLIENT_ID,
    redirect_uri: redirectUri,
    scope: ALL_SCOPES,
    code_challenge: challenge,
    code_challenge_method: 'S256',
    state,
  });
  return `${COGNITO_DOMAIN}/oauth2/authorize?${params.toString()}`;
}

export async function exchangeOAuthCode(
  code: string,
  verifier: string
): Promise<{ accessToken: string; idToken: string; refreshToken?: string }> {
  const redirectUri = window.location.origin;
  const body = new URLSearchParams({
    grant_type: 'authorization_code',
    client_id: CLIENT_ID,
    code,
    redirect_uri: redirectUri,
    code_verifier: verifier,
  });

  const res = await fetch(`${COGNITO_DOMAIN}/oauth2/token`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: body.toString(),
  });

  if (!res.ok) {
    const errorBody = await res.text();
    throw new Error(`Error en intercambio de código OAuth (${res.status}): ${errorBody}`);
  }

  const data = await res.json();
  return {
    accessToken: data.access_token,
    idToken: data.id_token,
    refreshToken: data.refresh_token,
  };
}
