/** @type {import('next').NextConfig} */
const nextConfig = {
  // Emit a self-contained .next/standalone server (its own minimal node_modules
  // + server.js) so the Docker runtime image stays small. No effect on `npm run
  // dev` / `npm run start` — only `next build` produces the standalone folder.
  output: "standalone",

  // better-sqlite3 is a native module — keep it server-only, never bundled.
  serverExternalPackages: ["better-sqlite3"],
};

export default nextConfig;
