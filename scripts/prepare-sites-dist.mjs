import { access, cp, mkdir, rm } from "node:fs/promises";

const outDir = new URL("../out/", import.meta.url);
const distDir = new URL("../dist/", import.meta.url);
const hostingDir = new URL("../.openai/", import.meta.url);
const distHostingDir = new URL("../dist/.openai/", import.meta.url);
const serverDir = new URL("../dist/server/", import.meta.url);
const workerEntry = new URL("../src/sites/static-worker.js", import.meta.url);
const distWorkerEntry = new URL("../dist/server/index.js", import.meta.url);

try {
  await access(outDir);
} catch {
  throw new Error(
    "Expected Next static export output at out/. Check next.config.ts output settings.",
  );
}

await rm(distDir, {
  force: true,
  maxRetries: 5,
  recursive: true,
  retryDelay: 100,
});
await cp(outDir, distDir, { recursive: true });
await cp(hostingDir, distHostingDir, { recursive: true });
await mkdir(serverDir, { recursive: true });
await cp(workerEntry, distWorkerEntry);

console.log("Prepared dist/ for Sites static hosting.");
