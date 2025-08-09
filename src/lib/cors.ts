import type { CorsOptions } from '@nestjs/common/interfaces/external/cors-options.interface';

const normalize = (url: string) => url.replace(/\/$/, '').trim();

export function buildCorsOriginOption(rawOrigins: string | undefined): CorsOptions['origin'] {
  const allowList = (rawOrigins || '')
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean)
    .map(normalize);

  if (!allowList.length) return true; // fallback: reflect origin

  return (
    origin: string | undefined,
    callback: (err: Error | null, allow?: boolean) => void,
  ) => {
    // Disallow requests with no Origin (non-browser requests)
    if (!origin) return callback(new Error('Not allowed by CORS'));
    const o = normalize(origin);
    if (allowList.includes(o)) return callback(null, true);
    return callback(new Error('Not allowed by CORS'));
  };
}

export function buildCorsOptions(): CorsOptions {
  return {
    origin: buildCorsOriginOption(process.env.CORS_ORIGINS),
    credentials: true,
    methods: 'GET,HEAD,PUT,PATCH,POST,DELETE,OPTIONS',
    allowedHeaders: 'Content-Type,Authorization',
  };
}
