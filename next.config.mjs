/** @type {import('next').NextConfig} */
const nextConfig = {
  // better-sqlite3 is a native module — keep it server-only, never bundled.
  serverExternalPackages: ["better-sqlite3"],
};

export default nextConfig;
