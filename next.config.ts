import type { NextConfig } from "next";

const securityHeaders = [
  { key: "X-Frame-Options", value: "DENY" },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  // The microphone is used to dictate answers (sent to /api/transcribe on this machine).
  { key: "Permissions-Policy", value: "camera=(), microphone=(self), geolocation=()" },
];

const nextConfig: NextConfig = {
  poweredByHeader: false,
  // Fija la raíz del proyecto (evita que Turbopack tome un lockfile de un directorio padre).
  turbopack: { root: __dirname },
  experimental: {
    // Backups imported from /ajustes can exceed the default 1 MB.
    serverActions: { bodySizeLimit: "20mb" },
  },
  async redirects() {
    return [
      { source: "/hoy", destination: "/", permanent: false },
      { source: "/cuenta", destination: "/ajustes", permanent: false },
    ];
  },
  async headers() {
    return [{ source: "/:path*", headers: securityHeaders }];
  },
};

export default nextConfig;
