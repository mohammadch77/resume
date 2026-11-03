// Bundles the one-off maintenance scripts into plain .mjs files (run inside deploy/Dockerfile.release), so the server needs no tsx and no source.
// Only pg and @node-rs/argon2 stay external (they are in the standalone node_modules: the app uses them at runtime). drizzle-orm and zod are NOT
// there (Next bundles them into its server chunks), so they are bundled into each tool.
import { build } from "esbuild";

const entries = ["migrate", "seed-owner", "seed-services", "seed-settings"];
for (const name of entries) {
  await build({
    entryPoints: [`scripts/${name}.ts`],
    outfile: `deploy-out/tools/${name}.mjs`,
    bundle: true,
    platform: "node",
    format: "esm",
    target: "node20",
    external: ["pg", "pg-native", "@node-rs/argon2"],
    // the scripts start themselves only when their file name looks like the .ts original (migrate.ts, seed-services.ts)
    banner: { js: "import { createRequire as __cr } from 'node:module'; const require = __cr(import.meta.url); process.argv[1] = (process.argv[1] ?? '').replace(/\.mjs$/, '.ts');" },
  });
  console.log(`bundled tools/${name}.mjs`);
}
