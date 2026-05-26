import { createReadStream } from "node:fs";
import { access, stat } from "node:fs/promises";
import { createServer } from "node:http";
import { extname, join, normalize, relative } from "node:path";
import { fileURLToPath } from "node:url";
import { handleMarketStateRequest } from "../api/market-state.js";

const rootDir = join(fileURLToPath(new URL("..", import.meta.url)));

const contentTypes = {
  ".css": "text/css; charset=utf-8",
  ".html": "text/html; charset=utf-8",
  ".ico": "image/x-icon",
  ".jpg": "image/jpeg",
  ".js": "text/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".mp3": "audio/mpeg",
  ".png": "image/png",
  ".svg": "image/svg+xml",
};

function getArgValue(name, fallbackValue) {
  const index = process.argv.indexOf(name);
  return index >= 0 && process.argv[index + 1] ? process.argv[index + 1] : fallbackValue;
}

const port = Number(getArgValue("--port", process.env.PORT || "5174"));
const host = getArgValue("--host", process.env.HOST || "0.0.0.0");
const publicDir = join(rootDir, getArgValue("--directory", "."));

async function fileExists(pathname) {
  try {
    await access(pathname);
    return true;
  } catch {
    return false;
  }
}

async function resolveStaticPath(urlPathname) {
  let pathname = decodeURIComponent(urlPathname.split("?")[0] || "/");

  if (pathname === "/") {
    pathname = "/index.html";
  }

  if (pathname === "/market") {
    pathname = "/market.html";
  }

  let filePath = normalize(join(publicDir, pathname));
  const relativePath = relative(publicDir, filePath);

  if (relativePath.startsWith("..") || relativePath === "") {
    return null;
  }

  if ((await fileExists(filePath)) && (await stat(filePath)).isFile()) {
    return filePath;
  }

  if (!extname(filePath)) {
    const htmlPath = `${filePath}.html`;

    if ((await fileExists(htmlPath)) && (await stat(htmlPath)).isFile()) {
      return htmlPath;
    }
  }

  return null;
}

const server = createServer(async (request, response) => {
  try {
    const requestUrl = new URL(request.url || "/", `http://${request.headers.host || "localhost"}`);

    if (requestUrl.pathname === "/api/market-state") {
      await handleMarketStateRequest(request, response);
      return;
    }

    const filePath = await resolveStaticPath(requestUrl.pathname);

    if (!filePath) {
      response.statusCode = 404;
      response.setHeader("Content-Type", "text/plain; charset=utf-8");
      response.end("Not found");
      return;
    }

    response.statusCode = 200;
    response.setHeader(
      "Content-Type",
      contentTypes[extname(filePath)] || "application/octet-stream",
    );
    createReadStream(filePath).pipe(response);
  } catch (error) {
    response.statusCode = 500;
    response.setHeader("Content-Type", "text/plain; charset=utf-8");
    response.end(error instanceof Error ? error.message : "Server error");
  }
});

server.listen(port, host, () => {
  console.log(`NEW PASA-T dev server running at http://${host}:${port}/`);
});
