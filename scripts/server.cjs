/* Meridian portable static server. Node built-ins only. Binds to loopback. */
const http = require("node:http");
const fs = require("node:fs");
const path = require("node:path");
const { spawn } = require("node:child_process");
const root = process.argv[2]
  ? path.resolve(process.argv[2])
  : path.resolve(__dirname, "../application");
let port = Number(process.env.MERIDIAN_PORT || 4273);
let attempts = 0;
if (!Number.isInteger(port) || port < 1 || port > 65535) {
  console.error("MERIDIAN_PORT must be a port number from 1 to 65535.");
  process.exit(1);
}
const types = {
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".json": "application/json",
  ".geojson": "application/geo+json",
  ".svg": "image/svg+xml",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".woff2": "font/woff2",
  ".ico": "image/x-icon",
  ".txt": "text/plain; charset=utf-8",
};
const server = http.createServer((req, res) => {
  try {
    const url = new URL(req.url, "http://localhost");
    const name = decodeURIComponent(url.pathname);
    let file = path.resolve(root, "." + name);
    if (file !== root && !file.startsWith(root + path.sep)) {
      res.writeHead(403).end("Forbidden");
      return;
    }
    if (fs.existsSync(file) && fs.statSync(file).isDirectory())
      file = path.join(file, "index.html");
    if (!fs.existsSync(file) || !fs.statSync(file).isFile()) {
      res.writeHead(404, { "Content-Type": "text/plain" }).end("Not found");
      return;
    }
    res.writeHead(200, {
      "Content-Type": types[path.extname(file)] || "application/octet-stream",
      "Cache-Control": "no-cache",
      "X-Content-Type-Options": "nosniff",
    });
    fs.createReadStream(file).pipe(res);
  } catch {
    res.writeHead(400).end("Invalid request");
  }
});
server.on("error", (error) => {
  if (error.code === "EADDRINUSE" && !process.env.MERIDIAN_PORT && attempts < 20) {
    attempts++;
    port++;
    server.listen(port, "127.0.0.1");
    return;
  }
  console.error(
    `Meridian could not start: ${error.message}\nClose other Meridian windows or choose another port: set MERIDIAN_PORT=4275\nIf school policy blocks executables or localhost, open OFFLINE_PREVIEW.html.`,
  );
  process.exitCode = 1;
});
server.on("listening", () => {
  const url = `http://127.0.0.1:${port}`;
  console.log(
    `Meridian is ready at ${url}\nKeep this window open. Press Ctrl+C to stop.\nNo internet connection is required.`,
  );
  if (!process.env.MERIDIAN_NO_BROWSER) {
    spawn(process.env.ComSpec || "cmd.exe", ["/d", "/c", "start", "", url], { windowsHide: true }).on(
      "error",
      () => console.log(`Open ${url} in your browser.`),
    );
  }
});
server.listen(port, "127.0.0.1");
