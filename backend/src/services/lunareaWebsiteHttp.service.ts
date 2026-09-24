import http from 'http';
import https from 'https';

type PostJsonOptions = {
  token: string;
  hostHeader?: string;
  insecureTls?: boolean;
  timeoutMs?: number;
};

export type WebsitePostResponse = {
  ok: boolean;
  status: number;
  text: string;
};

function isLocalHost(hostname: string) {
  return ['127.0.0.1', 'localhost', '::1'].includes(hostname);
}

function shouldUseInsecureTls(url: URL, explicit?: boolean) {
  return explicit === true || (url.protocol === 'https:' && isLocalHost(url.hostname));
}

export function parseBoolean(value: unknown) {
  return String(value || '').toLowerCase() === 'true' || value === true;
}

export async function postJsonToLunareaWebsite(
  targetUrl: string,
  payload: unknown,
  options: PostJsonOptions
): Promise<WebsitePostResponse> {
  const url = new URL(targetUrl);
  const body = JSON.stringify(payload);
  const isHttps = url.protocol === 'https:';
  const client = isHttps ? https : http;

  return new Promise((resolve, reject) => {
    const request = client.request(
      {
        protocol: url.protocol,
        hostname: url.hostname,
        port: url.port || undefined,
        method: 'POST',
        path: `${url.pathname}${url.search}`,
        timeout: options.timeoutMs || 120000,
        rejectUnauthorized: isHttps ? !shouldUseInsecureTls(url, options.insecureTls) : undefined,
        headers: {
          'Content-Type': 'application/json',
          'Content-Length': Buffer.byteLength(body),
          'X-Luna-Webhook-Token': options.token,
          ...(options.hostHeader ? { Host: options.hostHeader } : {}),
        },
      },
      (response) => {
        const chunks: Buffer[] = [];

        response.on('data', (chunk) => {
          chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
        });

        response.on('end', () => {
          const status = response.statusCode || 0;
          resolve({
            ok: status >= 200 && status < 300,
            status,
            text: Buffer.concat(chunks).toString('utf8'),
          });
        });
      }
    );

    request.on('timeout', () => {
      request.destroy(new Error(`Website sync timeout after ${options.timeoutMs || 120000}ms`));
    });

    request.on('error', reject);
    request.write(body);
    request.end();
  });
}
