import type { NextConfig } from "next";
import { createHash } from "crypto";
import { THEME_INIT_SCRIPT } from "./lib/theme/themeInitScript";

// pages/_document.js inlines THEME_INIT_SCRIPT (the anti-flash theme
// script) to apply dark/light mode before React hydrates. Rather than
// weakening script-src with 'unsafe-inline' for the whole site, only
// this one exact script is allowlisted via its content hash - the
// standard CSP pattern for a known, static inline script. Computed
// from the same shared string _document.js renders, so it can never
// drift out of sync.
const THEME_INIT_SCRIPT_HASH = `'sha256-${createHash("sha256").update(THEME_INIT_SCRIPT).digest("base64")}'`;

// All external API calls (OpenAI, Supabase, Resend) happen server-side in
// pages/api/*, so the browser itself never needs to reach those hosts -
// connect-src/img-src/etc. can stay scoped to 'self'.
const CONTENT_SECURITY_POLICY = [
  "default-src 'self'",
  `script-src 'self' ${THEME_INIT_SCRIPT_HASH}`,
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data:",
  "font-src 'self' data:",
  "connect-src 'self'",
  "frame-ancestors 'none'",
  "base-uri 'self'",
  "form-action 'self'"
].join("; ");

const nextConfig: NextConfig = {
  logging: {
    incomingRequests: false
  },
  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          { key: "X-Frame-Options", value: "DENY" },
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
          { key: "X-DNS-Prefetch-Control", value: "off" },
          { key: "Strict-Transport-Security", value: "max-age=31536000; includeSubDomains; preload" },
          { key: "Content-Security-Policy", value: CONTENT_SECURITY_POLICY }
        ]
      }
    ];
  }
};

export default nextConfig;
