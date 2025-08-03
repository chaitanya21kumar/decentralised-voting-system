/* next.config.js */

/** Content-Security-Policy (unchanged) */
const ContentSecurityPolicy = `
  default-src 'self';
  script-src 'self';
  style-src 'self' https://fonts.googleapis.com;
  img-src 'self' data:;
  connect-src 'self' https://api.yourdomain.com;
  font-src https://fonts.gstatic.com;
  object-src 'none';
  base-uri 'self';
  form-action 'self';
  report-uri /api/csp-report;
`.replace(/\n/g, "");

const nextConfig = {
  reactStrictMode: true,

  /** Inject CSP and other security headers */
  async headers() {
    return [
      {
        source: "/(.*)",
        headers: [
          { key: "Content-Security-Policy-Report-Only", value: ContentSecurityPolicy },
          { key: "Referrer-Policy",       value: "strict-origin-when-cross-origin" },
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "X-Frame-Options",       value: "DENY" },
          { key: "X-XSS-Protection",      value: "1; mode=block" },
        ],
      },
    ];
  },

  /** Stub Node-only modules so Webpack stops erroring on face-api.js */
  webpack(config) {
    config.resolve.fallback = {
      ...config.resolve.fallback,
      fs: false,
      encoding: false,
      path: false,
    };
    return config;
  },
};

module.exports = nextConfig;
