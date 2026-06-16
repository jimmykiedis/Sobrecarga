import http from "node:http";
import { readFile } from "node:fs/promises";
import { extname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const rootDir = resolve(fileURLToPath(new URL("..", import.meta.url)));
const port = Number(process.env.PORT || 4173);

const contentTypes = {
  ".css": "text/css; charset=utf-8",
  ".html": "text/html; charset=utf-8",
  ".js": "application/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".svg": "image/svg+xml",
  ".txt": "text/plain; charset=utf-8",
};

const server = http.createServer(async (req, res) => {
  const requestUrl = new URL(req.url || "/", `http://${req.headers.host || "localhost"}`);
  let pathname = decodeURIComponent(requestUrl.pathname);

  if (pathname === "/") {
    pathname = "/index.html";
  }

  const filePath = join(rootDir, pathname.replace(/^\/+/, ""));

  try {
    const data = await readFile(filePath);
    res.writeHead(200, {
      "Content-Type": contentTypes[extname(filePath)] || "application/octet-stream",
      "Cache-Control": "no-store",
    });
    res.end(data);
    return;
  } catch {
    try {
      const data = await readFile(join(rootDir, "index.html"));
      res.writeHead(200, {
        "Content-Type": "text/html; charset=utf-8",
        "Cache-Control": "no-store",
      });
      res.end(data);
    } catch (error) {
      res.writeHead(500, { "Content-Type": "text/plain; charset=utf-8" });
      res.end(`Erro ao iniciar o app: ${error.message}`);
    }
  }
});

server.listen(port, "127.0.0.1", () => {
  console.log(`Sobrecarga rodando em http://127.0.0.1:${port}`);
});
