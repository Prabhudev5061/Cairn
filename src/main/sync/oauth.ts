import crypto from 'crypto';
import http from 'http';
import { AddressInfo } from 'net';

/**
 * Generates an RFC 7636 compliant PKCE code verifier and SHA-256 challenge.
 */
export function generatePkcePair(): { verifier: string; challenge: string } {
  // 32 random bytes -> 43 base64url characters
  const verifier = crypto
    .randomBytes(32)
    .toString('base64url')
    .replace(/[^a-zA-Z0-9-._~]/g, '');

  const challenge = crypto
    .createHash('sha256')
    .update(verifier)
    .digest('base64url');

  return { verifier, challenge };
}

/**
 * Generates an unpredictable state string to protect against CSRF in the OAuth flow.
 */
export function generateOAuthState(): string {
  return crypto.randomBytes(16).toString('hex');
}

/**
 * Constructs the Google OAuth 2.0 authorization URL for desktop native apps (RFC 8252).
 */
export function buildGoogleAuthUrl(
  clientId: string,
  redirectUri: string,
  challenge: string,
  state: string
): string {
  const url = new URL('https://accounts.google.com/o/oauth2/v2/auth');
  url.searchParams.set('client_id', clientId);
  url.searchParams.set('redirect_uri', redirectUri);
  url.searchParams.set('response_type', 'code');
  url.searchParams.set('scope', 'https://www.googleapis.com/auth/drive.file email');
  url.searchParams.set('code_challenge', challenge);
  url.searchParams.set('code_challenge_method', 'S256');
  url.searchParams.set('state', state);
  url.searchParams.set('access_type', 'offline');
  url.searchParams.set('prompt', 'consent');
  return url.toString();
}

export interface OAuthTokens {
  access_token: string;
  refresh_token?: string;
  expires_in: number;
  token_type: string;
  id_token?: string;
}

/**
 * Exchanges the OAuth authorization code for access and refresh tokens.
 */
export async function exchangeCodeForTokens(
  code: string,
  verifier: string,
  clientId: string,
  redirectUri: string,
  clientSecret?: string
): Promise<OAuthTokens> {
  const body = new URLSearchParams({
    client_id: clientId,
    code,
    code_verifier: verifier,
    grant_type: 'authorization_code',
    redirect_uri: redirectUri
  });

  if (clientSecret) {
    body.set('client_secret', clientSecret);
  }

  const res = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: body.toString()
  });

  if (!res.ok) {
    const errorText = await res.text().catch(() => '');
    throw new Error(`OAuth token exchange failed (HTTP ${res.status}): ${errorText}`);
  }

  return (await res.json()) as OAuthTokens;
}

/**
 * Refreshes an expired access token using the stored refresh token.
 */
export async function refreshAccessToken(
  refreshToken: string,
  clientId: string,
  clientSecret?: string
): Promise<{ access_token: string; expires_in: number }> {
  const body = new URLSearchParams({
    client_id: clientId,
    grant_type: 'refresh_token',
    refresh_token: refreshToken
  });

  if (clientSecret) {
    body.set('client_secret', clientSecret);
  }

  const res = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: body.toString()
  });

  if (!res.ok) {
    const errorText = await res.text().catch(() => '');
    throw new Error(`OAuth token refresh failed (HTTP ${res.status}): ${errorText}`);
  }

  const data = (await res.json()) as { access_token: string; expires_in: number };
  return data;
}

export interface LoopbackServerHandle {
  port: number;
  redirectUri: string;
  waitForCode: (timeoutMs?: number) => Promise<string>;
  close: () => void;
}

/**
 * Starts a transient HTTP server on 127.0.0.1 with an OS-assigned ephemeral port
 * to capture the OAuth redirect callback securely.
 */
export function startOAuthLoopbackServer(expectedState: string): Promise<LoopbackServerHandle> {
  return new Promise((resolve, reject) => {
    let resolvedCode: ((code: string) => void) | null = null;
    let rejectedCode: ((err: Error) => void) | null = null;
    let timer: NodeJS.Timeout | null = null;

    const server = http.createServer((req, res) => {
      try {
        if (!req.url) {
          res.writeHead(400, { 'Content-Type': 'text/plain' });
          res.end('Bad Request');
          return;
        }

        const parsedUrl = new URL(req.url, `http://${req.headers.host || '127.0.0.1'}`);
        if (parsedUrl.pathname !== '/oauth/callback') {
          res.writeHead(404, { 'Content-Type': 'text/plain' });
          res.end('Not Found');
          return;
        }

        const code = parsedUrl.searchParams.get('code');
        const state = parsedUrl.searchParams.get('state');
        const error = parsedUrl.searchParams.get('error');

        if (error) {
          res.writeHead(400, { 'Content-Type': 'text/html; charset=utf-8' });
          res.end(`
            <html>
              <body style="font-family: system-ui, -apple-system, sans-serif; background: #121316; color: #f87171; display: grid; place-content: center; height: 100vh; margin: 0;">
                <div style="background: #1e2025; padding: 2rem 3rem; border-radius: 8px; border: 1px solid #374151; text-align: center;">
                  <h2>Authentication Failed</h2>
                  <p>${error}</p>
                  <p style="color: #9ca3af; font-size: 0.875rem;">You may close this tab and return to Cairn.</p>
                </div>
              </body>
            </html>
          `);
          if (rejectedCode) rejectedCode(new Error(`OAuth error: ${error}`));
          return;
        }

        if (state !== expectedState) {
          res.writeHead(400, { 'Content-Type': 'text/plain' });
          res.end('Invalid state parameter: CSRF protection failed.');
          if (rejectedCode) rejectedCode(new Error('State mismatch'));
          return;
        }

        if (!code) {
          res.writeHead(400, { 'Content-Type': 'text/plain' });
          res.end('Missing code parameter.');
          if (rejectedCode) rejectedCode(new Error('Missing code'));
          return;
        }

        res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
        res.end(`
          <html>
            <body style="font-family: system-ui, -apple-system, sans-serif; background: #121316; color: #f3f4f6; display: grid; place-content: center; height: 100vh; margin: 0;">
              <div style="background: #1e2025; padding: 2rem 3rem; border-radius: 8px; border: 1px solid #374151; text-align: center;">
                <h2 style="color: #6366f1; margin-top: 0;">Connected to Google Drive!</h2>
                <p>Cairn has securely received authorization. You can close this tab and return to the application.</p>
              </div>
            </body>
          </html>
        `);

        if (resolvedCode) {
          resolvedCode(code);
        }
      } catch (err) {
        if (rejectedCode) rejectedCode(err instanceof Error ? err : new Error(String(err)));
      }
    });

    server.on('error', (err) => {
      reject(err);
    });

    server.listen(0, '127.0.0.1', () => {
      const addr = server.address() as AddressInfo;
      const port = addr.port;
      const redirectUri = `http://127.0.0.1:${port}/oauth/callback`;

      const close = () => {
        if (timer) clearTimeout(timer);
        try {
          server.close();
        } catch {
          // Ignore if already closed
        }
      };

      const waitForCode = (timeoutMs = 120000): Promise<string> => {
        return new Promise<string>((res, rej) => {
          resolvedCode = (c) => {
            close();
            res(c);
          };
          rejectedCode = (e) => {
            close();
            rej(e);
          };

          timer = setTimeout(() => {
            close();
            rej(new Error('OAuth flow timed out after 120s'));
          }, timeoutMs);
        });
      };

      resolve({ port, redirectUri, waitForCode, close });
    });
  });
}
