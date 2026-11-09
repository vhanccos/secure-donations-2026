/**
 * Authentication and Token Helper
 * Acquires genuine OAuth 2.0 PKCE access and ID tokens from Amazon Cognito.
 */

import { CONFIG } from './config.js';

const tokenCache = new Map();

/**
 * Perform OAuth 2.0 authorization code exchange with Cognito Hosted UI
 */
export async function getCognitoTokens(username, password) {
  if (tokenCache.has(username)) {
    return tokenCache.get(username);
  }

  const authUrl = `${CONFIG.COGNITO_DOMAIN}/oauth2/authorize?response_type=code&client_id=${CONFIG.COGNITO_CLIENT_ID}&redirect_uri=${encodeURIComponent(CONFIG.REDIRECT_URI)}&scope=${encodeURIComponent(CONFIG.ALL_SCOPES)}`;

  const res1 = await fetch(authUrl, { redirect: 'manual' });
  const cookies1 = res1.headers.getSetCookie
    ? res1.headers.getSetCookie()
    : [res1.headers.get('set-cookie')].filter(Boolean);
  const loginUrl = res1.headers.get('location');

  if (!loginUrl) {
    throw new Error(`Cognito authorize failed: missing location header. Status: ${res1.status}`);
  }

  const cookieHeader1 = cookies1.map((c) => c.split(';')[0]).join('; ');
  const res2 = await fetch(loginUrl, { headers: { cookie: cookieHeader1 } });
  const html = await res2.text();
  const cookies2 = res2.headers.getSetCookie
    ? res2.headers.getSetCookie()
    : [res2.headers.get('set-cookie')].filter(Boolean);
  const allCookies = [...cookies1, ...cookies2].map((c) => c.split(';')[0]).join('; ');

  const csrfMatch = html.match(/name="_csrf"\s+value="([^"]+)"/);
  if (!csrfMatch) {
    throw new Error('Could not find CSRF token on Cognito login page');
  }
  const csrf = csrfMatch[1];

  const params = new URLSearchParams();
  params.append('_csrf', csrf);
  params.append('username', username);
  params.append('password', password);
  params.append('signInSubmitButton', 'Sign in');

  const postUrl = `${CONFIG.COGNITO_DOMAIN}/login?response_type=code&client_id=${CONFIG.COGNITO_CLIENT_ID}&redirect_uri=${encodeURIComponent(CONFIG.REDIRECT_URI)}&scope=${encodeURIComponent(CONFIG.ALL_SCOPES)}`;
  const res3 = await fetch(postUrl, {
    method: 'POST',
    headers: {
      'content-type': 'application/x-www-form-urlencoded',
      cookie: allCookies,
    },
    body: params.toString(),
    redirect: 'manual',
  });

  const redirectLoc = res3.headers.get('location');
  if (!redirectLoc || !redirectLoc.includes('code=')) {
    throw new Error(`Login failed for ${username}: status=${res3.status}, location=${redirectLoc}`);
  }

  const url = new URL(redirectLoc);
  const code = url.searchParams.get('code');

  const tokenParams = new URLSearchParams();
  tokenParams.append('grant_type', 'authorization_code');
  tokenParams.append('client_id', CONFIG.COGNITO_CLIENT_ID);
  tokenParams.append('code', code);
  tokenParams.append('redirect_uri', CONFIG.REDIRECT_URI);

  const resToken = await fetch(`${CONFIG.COGNITO_DOMAIN}/oauth2/token`, {
    method: 'POST',
    headers: { 'content-type': 'application/x-www-form-urlencoded' },
    body: tokenParams.toString(),
  });

  const tokenData = await resToken.json();
  if (!tokenData.access_token) {
    throw new Error(`Failed to exchange code: ${JSON.stringify(tokenData)}`);
  }

  const payload = JSON.parse(
    Buffer.from(tokenData.access_token.split('.')[1], 'base64').toString('utf8')
  );

  const result = {
    accessToken: tokenData.access_token,
    idToken: tokenData.id_token,
    refreshToken: tokenData.refresh_token,
    expiresIn: tokenData.expires_in,
    tokenType: tokenData.token_type,
    sub: payload.sub,
    groups: payload['cognito:groups'] || [],
    scope: payload.scope || '',
  };

  tokenCache.set(username, result);
  return result;
}

/**
 * HTTP helper wrapping native fetch for API requests
 */
export async function apiRequest(method, path, options = {}) {
  const url = path.startsWith('http') ? path : `${CONFIG.API_BASE_URL}${path}`;
  const headers = { ...(options.headers || {}) };

  const fetchOpts = {
    method,
    headers,
  };

  if (options.body) {
    if (typeof options.body === 'object') {
      fetchOpts.body = JSON.stringify(options.body);
      headers['Content-Type'] = 'application/json';
    } else {
      fetchOpts.body = options.body;
    }
  }

  const res = await fetch(url, fetchOpts);
  const resHeaders = {};
  for (const [k, v] of res.headers.entries()) {
    resHeaders[k.toLowerCase()] = v;
  }

  const text = await res.text();
  let json = null;
  try {
    json = JSON.parse(text);
  } catch {}

  return {
    method,
    path,
    url,
    status: res.status,
    statusText: res.statusText,
    headers: resHeaders,
    bodyText: text,
    body: json,
  };
}
