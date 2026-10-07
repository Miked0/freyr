export interface GoogleConfig {
  clientId: string;
  clientSecret: string;
  /** Callback URL registered at Google; derived from the request host when absent. */
  redirectUri?: string;
}

export interface GoogleIdentity {
  sub: string;
  email: string;
}

const AUTH_URL = 'https://accounts.google.com/o/oauth2/v2/auth';
const TOKEN_URL = 'https://oauth2.googleapis.com/token';
const ISSUERS = ['https://accounts.google.com', 'accounts.google.com'];

export class GoogleLoginError extends Error {}

export function googleConfigFromEnv(): GoogleConfig | undefined {
  const { GOOGLE_CLIENT_ID: clientId, GOOGLE_CLIENT_SECRET: clientSecret, GOOGLE_REDIRECT_URI: redirectUri } = process.env;
  return clientId && clientSecret ? { clientId, clientSecret, redirectUri: redirectUri || undefined } : undefined;
}

export function googleAuthUrl(config: GoogleConfig, redirectUri: string, state: string): string {
  const params = new URLSearchParams({
    client_id: config.clientId,
    redirect_uri: redirectUri,
    response_type: 'code',
    scope: 'openid email profile',
    state,
    prompt: 'select_account',
  });
  return `${AUTH_URL}?${params}`;
}

/**
 * Trades the authorization code for the person's Google identity. The ID token comes straight from Google's
 * token endpoint over TLS, so its signature need not be checked (Google's OpenID Connect guide); its claims are.
 */
export async function exchangeGoogleCode(config: GoogleConfig, code: string, redirectUri: string): Promise<GoogleIdentity> {
  const response = await fetch(TOKEN_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      code,
      client_id: config.clientId,
      client_secret: config.clientSecret,
      redirect_uri: redirectUri,
      grant_type: 'authorization_code',
    }).toString(),
  });
  if (!response.ok) throw new GoogleLoginError(`Google recusou o código (${response.status}).`);
  const { id_token: idToken } = (await response.json()) as { id_token?: string };
  const payload = idToken?.split('.')[1];
  if (!payload) throw new GoogleLoginError('Google não devolveu o ID token.');

  const claims = JSON.parse(Buffer.from(payload, 'base64url').toString('utf8')) as Record<string, unknown>;
  if (!ISSUERS.includes(String(claims.iss))) throw new GoogleLoginError('Emissor inválido.');
  if (claims.aud !== config.clientId) throw new GoogleLoginError('Token emitido para outro app.');
  if (typeof claims.exp !== 'number' || claims.exp * 1000 < Date.now()) throw new GoogleLoginError('Token expirado.');
  if (claims.email_verified !== true) throw new GoogleLoginError('E-mail não verificado pelo Google.');
  if (typeof claims.sub !== 'string' || !claims.sub || typeof claims.email !== 'string') {
    throw new GoogleLoginError('Token sem identificação.');
  }
  return { sub: claims.sub, email: claims.email };
}
