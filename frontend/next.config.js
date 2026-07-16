/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    remotePatterns: [
      { protocol: "http", hostname: "localhost" },
      { protocol: "https", hostname: "**" },
    ],
  },

  // No rewrites() proxy to the backend on purpose -- frontend/lib/api.ts
  // calls NEXT_PUBLIC_API_URL directly from both server and browser. A
  // rewrite-based proxy adds an extra hop through this app's own hosting
  // runtime, which is a common source of 404s (rewrite not honored on some
  // static/edge hosts) and 504s (the proxying function times out waiting
  // on a slow-to-wake backend) in production. Direct calls + CORS
  // (configured in backend/src/server.js via FRONTEND_ORIGIN) are more
  // reliable across hosts.
};

module.exports = nextConfig;
