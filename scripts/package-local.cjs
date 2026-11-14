/* Package an already validated static export outside the source repository. */
const fs = require("node:fs");
const path = require("node:path");
const { execFileSync } = require("node:child_process");
const root = path.resolve(__dirname, "..");
const destination = path.resolve(process.argv[2] || path.join(root, "..", "MERIDIAN_LOCAL_DEMO"));
if (destination === root || destination.startsWith(root + path.sep))
  throw new Error("The local presentation must be outside the source repository.");
if (fs.existsSync(destination))
  throw new Error("Destination already exists. Choose a new location; existing packages are never overwritten.");
if (!fs.existsSync(path.join(root, "out/app/optimize/index.html")))
  throw new Error("Build the validated government-services export first.");
const git = (...args) => execFileSync("git", args, { cwd: root, encoding: "utf8" }).trim();
if (git("status", "--porcelain"))
  throw new Error("Commit the validated source before packaging its revision.");
const commit = git("rev-parse", "HEAD");
fs.mkdirSync(path.join(destination, "runtime"), { recursive: true });
fs.cpSync(path.join(root, "out"), path.join(destination, "application"), { recursive: true });
// Next's Windows static exporter can emit nested RSC segment filenames.
function aliases(directory) {
  for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
    if (!entry.isDirectory()) continue;
    const child = path.join(directory, entry.name);
    if (!entry.name.startsWith("__next.")) { aliases(child); continue; }
    function flatten(folder, parts) {
      for (const file of fs.readdirSync(folder, { withFileTypes: true })) {
        const names = [...parts, file.name];
        if (file.isDirectory()) flatten(path.join(folder, file.name), names);
        else fs.copyFileSync(path.join(folder, file.name), path.join(directory, names.join(".")));
      }
    }
    flatten(child, [entry.name]);
  }
}
aliases(path.join(destination, "application"));
fs.copyFileSync(process.execPath, path.join(destination, "runtime/node.exe"));
fs.copyFileSync(path.join(root, "scripts/server.cjs"), path.join(destination, "runtime/server.cjs"));
fs.copyFileSync(path.join(root, "scripts/NODE_LICENSE.txt"), path.join(destination, "runtime/NODE_LICENSE.txt"));
const notices = path.join(destination, "licenses");
fs.mkdirSync(notices);
const dependencies = JSON.parse(fs.readFileSync(path.join(root, "package.json"), "utf8")).dependencies;
for (const name of Object.keys(dependencies)) {
  const directory = path.join(root, "node_modules", name);
  for (const file of fs.readdirSync(directory)) {
    if (/^(licen[sc]e|notice|copyright)(\.|$)/i.test(file) && fs.statSync(path.join(directory, file)).isFile())
      fs.copyFileSync(path.join(directory, file), path.join(notices, `${name.replaceAll("/", "_")}-${file}`));
  }
}
fs.writeFileSync(path.join(destination, "START_MERIDIAN.bat"),
  '@echo off\r\nsetlocal\r\ncd /d "%~dp0"\r\nset NODE_OPTIONS=\r\n"runtime\\node.exe" "runtime\\server.cjs"\r\nif errorlevel 1 pause\r\n');
fs.writeFileSync(path.join(destination, "BUILD_INFO.json"), JSON.stringify({
  commit, builtAt: new Date().toISOString(), node: process.version,
  platform: process.platform, architecture: process.arch,
  strategy: "Same Next.js static export as hosted source revision; loopback-only HTTP",
}, null, 2));
fs.writeFileSync(path.join(destination, "README_FIRST.txt"), `MERIDIAN LOCAL PRESENTATION

Source commit: ${commit}
Run START_MERIDIAN.bat and keep its console open. Open the localhost address
printed in the console (normally http://127.0.0.1:4273).
This is a genuine local server, not the Vercel website.

Includes Node.js ${process.version}, ${process.platform} ${process.arch}, and license.
No separately installed Node, pnpm, Python or administrator account is required.
Requires Windows x64 and a modern Edge/Chrome browser. School executable,
USB and loopback policies have NOT been tested on the school laptop.
Stop with Ctrl+C. If local execution is blocked, use the ONLINE fallback:
https://meridian-lake-delta.vercel.app

Bundled app, map, styles and JavaScript work without external network access.
Official source links require internet. No live fare or government services exist.
Use fictional, non-sensitive demonstration metadata only.
Browser storage is tied to the exact localhost address and port; it is not
copied from Vercel or carried on this USB. Clearing local data deletes that
browser origin's Meridian metadata.
`);
console.log(JSON.stringify({ destination, commit }, null, 2));
