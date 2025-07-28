const ContentSecurityPolicy = `
  default-src 'self';
  script-src 'self' 'unsafe-eval' 'unsafe-inline';
  style-src 'self' 'unsafe-inline' https://fonts.googleapis.com;
  img-src 'self' data:;
  connect-src 'self' https://api.yourdomain.com;
  font-src 'self' https://fonts.gstatic.com;
  object-src 'none';
  base-uri 'self';
  form-action 'self';
  report-uri /api/csp-report;
`;

module.exports = {
  async headers() {
    // Only apply CSP in production
    if (process.env.NODE_ENV === "production") {
      return [
        {
          source: "/(.*)", // apply to all routes
          headers: [
            {
              key: "Content-Security-Policy-Report-Only", 
              value: ContentSecurityPolicy.replace(/\n/g, ""),
            },
            {
              key: "Referrer-Policy",
              value: "strict-origin-when-cross-origin",
            },
            {
              key: "X-Content-Type-Options",
              value: "nosniff",
            },
            {
              key: "X-Frame-Options",
              value: "DENY",
            },
            {
              key: "X-XSS-Protection",
              value: "1; mode=block",
            },
          ],
        },
      ];
    }
    return [];
  },
};
