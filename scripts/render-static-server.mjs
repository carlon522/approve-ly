import { createReadStream } from "node:fs";
import { stat } from "node:fs/promises";
import { createServer } from "node:http";
import { extname, join, resolve, sep } from "node:path";

const root = resolve("out");
const rootPrefix = root.endsWith(sep) ? root : `${root}${sep}`;
const port = Number(process.env.PORT || 3000);
const host = process.env.HOST || "0.0.0.0";

const contentTypes = new Map([
  [".avif", "image/avif"],
  [".css", "text/css; charset=utf-8"],
  [".gif", "image/gif"],
  [".html", "text/html; charset=utf-8"],
  [".ico", "image/x-icon"],
  [".jpeg", "image/jpeg"],
  [".jpg", "image/jpeg"],
  [".js", "text/javascript; charset=utf-8"],
  [".json", "application/json; charset=utf-8"],
  [".png", "image/png"],
  [".svg", "image/svg+xml"],
  [".txt", "text/plain; charset=utf-8"],
  [".webp", "image/webp"],
  [".woff", "font/woff"],
  [".woff2", "font/woff2"],
]);

function isInsideRoot(filePath) {
  return filePath === root || filePath.startsWith(rootPrefix);
}

async function findFile(pathname) {
  let decodedPath;

  try {
    decodedPath = decodeURIComponent(pathname);
  } catch {
    return null;
  }

  const requestPath = decodedPath.replace(/^\/+/, "");
  const candidates = [];

  if (decodedPath === "/" || decodedPath.endsWith("/")) {
    candidates.push(join(root, requestPath, "index.html"));
  } else {
    candidates.push(join(root, requestPath));

    if (!extname(decodedPath)) {
      candidates.push(join(root, requestPath, "index.html"));
      candidates.push(join(root, "index.html"));
    }
  }

  for (const candidate of candidates) {
    const resolved = resolve(candidate);

    if (!isInsideRoot(resolved)) {
      continue;
    }

    try {
      const fileStats = await stat(resolved);

      if (fileStats.isFile()) {
        return resolved;
      }
    } catch {
      // Try the next candidate.
    }
  }

  return null;
}

const server = createServer(async (request, response) => {
  if (request.method !== "GET" && request.method !== "HEAD") {
    response.writeHead(405, { Allow: "GET, HEAD" });
    response.end("Method Not Allowed");
    return;
  }

  const url = new URL(request.url || "/", "http://localhost");
  const filePath = await findFile(url.pathname);

  if (!filePath) {
    response.writeHead(404, { "Content-Type": "text/plain; charset=utf-8" });
    response.end("Not Found");
    return;
  }

  const contentType =
    contentTypes.get(extname(filePath)) || "application/octet-stream";

  response.writeHead(200, {
    "Cache-Control": filePath.includes(`${sep}_next${sep}static${sep}`)
      ? "public, max-age=31536000, immutable"
      : "public, max-age=0, must-revalidate",
    "Content-Type": contentType,
  });

  if (request.method === "HEAD") {
    response.end();
    return;
  }

  createReadStream(filePath).pipe(response);
});

server.listen(port, host, () => {
  console.log(`Approve.ly static server listening on http://${host}:${port}`);
});
