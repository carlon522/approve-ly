import { access, cp, rm } from "node:fs/promises";

const outDir = new URL("../out/", import.meta.url);
const distDir = new URL("../dist/", import.meta.url);

try {
  await access(outDir);
} catch {
  throw new Error(
    "Expected Next static export output at out/. Check next.config.ts output settings.",
  );
}

await rm(distDir, { force: true, recursive: true });
await cp(outDir, distDir, { recursive: true });

console.log("Prepared dist/ for Sites static hosting.");
