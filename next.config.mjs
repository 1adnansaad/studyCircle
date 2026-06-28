/** @type {import('next').NextConfig} */
const nextConfig = {
  // Emit a self-contained .next/standalone server (its own minimal node_modules
  // + server.js) so the Docker runtime image stays small. No effect on `npm run
  // dev` / `npm run start` — only `next build` produces the standalone folder.
  output: "standalone",

  // better-sqlite3 is a native module — keep it server-only, never bundled.
  serverExternalPackages: ["better-sqlite3"],

  // The seed template is read via fs at runtime (not statically imported), so
  // Vercel's function tracer can't see it. Force-include it in every function
  // bundle so the deployed serverless world can seed from ./data/enhanced-seed.db.
  outputFileTracingIncludes: {
    "/**/*": ["./data/enhanced-seed.db"],
  },
};

export default nextConfig;
