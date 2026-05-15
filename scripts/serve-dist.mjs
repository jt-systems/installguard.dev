import { createReadStream } from "node:fs";
import { access, readFile, stat } from "node:fs/promises";
import http from "node:http";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(__dirname, "..");
const distDir = path.join(rootDir, "dist");
const headersPath = path.join(distDir, "_headers");
const port = Number(process.env.PORT || 4321);

const contentTypes = new Map([
  [".css", "text/css; charset=utf-8"],
  [".html", "text/html; charset=utf-8"],
  [".ico", "image/x-icon"],
  [".js", "text/javascript; charset=utf-8"],
  [".json", "application/json; charset=utf-8"],
  [".map", "application/json; charset=utf-8"],
  [".png", "image/png"],
  [".svg", "image/svg+xml"],
  [".txt", "text/plain; charset=utf-8"],
  [".wasm", "application/wasm"],
  [".webmanifest", "application/manifest+json; charset=utf-8"],
  [".xml", "application/xml; charset=utf-8"],
]);

async function readHeaderRules() {
  try {
    const source = await readFile(headersPath, "utf8");
    /** @type {Array<{ pattern: string, headers: Record<string, string> }>} */
    const rules = [];
    /** @type {{ pattern: string, headers: Record<string, string> } | null} */
    let current = null;

    for (const rawLine of source.split(/\r?\n/)) {
      const line = rawLine.trimEnd();
      const trimmed = line.trim();

      if (!trimmed || trimmed.startsWith("#")) continue;

      if (!rawLine.startsWith(" ") && !rawLine.startsWith("\t")) {
        if (current) rules.push(current);
        current = { pattern: trimmed, headers: {} };
        continue;
      }

      if (!current) continue;

      const separator = trimmed.indexOf(":");
      if (separator === -1) continue;

      const name = trimmed.slice(0, separator).trim();
      const value = trimmed.slice(separator + 1).trim();
      current.headers[name] = value;
    }

    if (current) rules.push(current);
    return rules;
  } catch {
    return [];
  }
}

function matchesPattern(pattern, pathname) {
  if (pattern === "/*") return true;
  if (pattern.endsWith("*")) {
    return pathname.startsWith(pattern.slice(0, -1));
  }
  return pathname === pattern;
}

function headersForPath(rules, pathname) {
  return rules.reduce((collected, rule) => {
    if (matchesPattern(rule.pattern, pathname)) {
      Object.assign(collected, rule.headers);
    }
    return collected;
  }, {});
}

async function resolvePath(urlPath) {
  const pathname = decodeURIComponent(urlPath.split("?")[0]);
  const requested = pathname.endsWith("/") ? `${pathname}index.html` : pathname;
  const candidate = path.resolve(distDir, `.${requested}`);

  if (!candidate.startsWith(distDir)) return null;

  try {
    const fileStat = await stat(candidate);
    if (fileStat.isFile()) return candidate;
  } catch {
    if (!path.extname(candidate)) {
      const htmlCandidate = `${candidate}.html`;
      try {
        const htmlStat = await stat(htmlCandidate);
        if (htmlStat.isFile()) return htmlCandidate;
      } catch {
        return null;
      }
    }
  }

  return null;
}

await access(distDir);
const rules = await readHeaderRules();

const server = http.createServer(async (req, res) => {
  if (!req.url) {
    res.writeHead(400);
    res.end("Bad Request");
    return;
  }

  const requestUrl = new URL(req.url, `http://${req.headers.host || "127.0.0.1"}`);
  let filePath = await resolvePath(requestUrl.pathname);

  if (!filePath) {
    filePath = path.join(distDir, "404.html");
    try {
      await stat(filePath);
      res.statusCode = 404;
    } catch {
      res.writeHead(404);
      res.end("Not Found");
      return;
    }
  }

  const pathname = filePath.startsWith(distDir)
    ? `/${path.relative(distDir, filePath).replaceAll(path.sep, "/")}`
    : requestUrl.pathname;

  for (const [name, value] of Object.entries(headersForPath(rules, pathname))) {
    res.setHeader(name, value);
  }

  const ext = path.extname(filePath);
  res.setHeader("Content-Type", contentTypes.get(ext) || "application/octet-stream");

  if (req.method === "HEAD") {
    res.end();
    return;
  }

  createReadStream(filePath).pipe(res);
});

server.listen(port, "127.0.0.1", () => {
  console.log(`Smoke server listening on http://127.0.0.1:${port}`);
});
