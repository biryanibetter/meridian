const fs = require("node:fs");
const path = require("node:path");
const root = path.resolve(__dirname, "..");
const release = path.join(root, "MERIDIAN_USB_SUBMISSION");
if (!fs.existsSync(path.join(root, "out/index.html")))
  throw new Error("Run npm run build first.");
const bundledRuntime = path.join(release, "runtime/node.exe");
if (fs.existsSync(bundledRuntime)) {
  try {
    const handle = fs.openSync(bundledRuntime, "r+");
    fs.closeSync(handle);
  } catch {
    throw new Error("Close the submission's running server before rebuilding. Existing release has not been changed.");
  }
}
// This directory is the generated submission copy, never the development source.
// Recreate it so obsolete screenshots, instructions and earlier builds cannot leak.
fs.rmSync(release, { recursive: true, force: true });
fs.mkdirSync(release, { recursive: true });
fs.cpSync(path.join(root, "out"), path.join(release, "application"), {
  recursive: true,
});
// Next 16's Windows exporter preserves "\" in nested segment names while
// the browser protocol requests dots. Emit flat aliases, leaving originals intact.
function flattenSegments(directory) {
  for (const item of fs.readdirSync(directory, { withFileTypes: true })) {
    if (!item.isDirectory()) continue;
    const child = path.join(directory, item.name);
    if (item.name.startsWith("__next.")) {
      const collect = (dir, names) => {
        for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
          const parts = [...names, entry.name];
          if (entry.isDirectory()) collect(path.join(dir, entry.name), parts);
          else
            fs.copyFileSync(
              path.join(dir, entry.name),
              path.join(directory, parts.join(".")),
            );
        }
      };
      collect(child, [item.name]);
    } else flattenSegments(child);
  }
}
flattenSegments(path.join(release, "application"));
fs.mkdirSync(path.join(release, "runtime"), { recursive: true });
fs.copyFileSync(process.execPath, path.join(release, "runtime/node.exe"));
fs.copyFileSync(
  path.join(__dirname, "server.cjs"),
  path.join(release, "runtime/server.cjs"),
);
const license = path.join(path.dirname(process.execPath), "LICENSE");
if (fs.existsSync(license))
  fs.copyFileSync(license, path.join(release, "runtime/NODE_LICENSE.txt"));
else
  fs.copyFileSync(
    path.join(__dirname, "NODE_LICENSE.txt"),
    path.join(release, "runtime/NODE_LICENSE.txt"),
  );
for (const name of [
  "app",
  "components",
  "lib",
  "public",
  "scripts",
  "package.json",
  "package-lock.json",
  "next.config.ts",
  "next-env.d.ts",
  "tsconfig.json",
  "eslint.config.mjs",
  "postcss.config.mjs",
  "components.json",
]) {
  const from = path.join(root, name);
  if (fs.existsSync(from))
    fs.cpSync(from, path.join(release, "source", name), {
      recursive: true,
      filter: (file) => !/^(?:agents?\.md|\.env(?:\..*)?|.*\.log|.*\.tsbuildinfo)$/i.test(path.basename(file)),
    });
}
const data = JSON.parse(
  fs.readFileSync(path.join(root, "public/assets/countries.geojson"), "utf8"),
);
const ringPath = (ring) =>
  ring
    .map(
      ([lon, lat], i) =>
        `${i ? "L" : "M"}${((lon + 180) * 3).toFixed(1)},${((90 - lat) * 3).toFixed(1)}`,
    )
    .join(" ") + "Z";
const land = data.features
  .map((f) => {
    const polygons =
      f.geometry.type === "Polygon"
        ? [f.geometry.coordinates]
        : f.geometry.coordinates;
    return `<path d="${polygons.map((p) => p.map(ringPath).join(" ")).join(" ")}" fill-rule="evenodd"/>`;
  })
  .join("");
const map = `<svg viewBox="0 0 1080 540" role="img" aria-label="Offline geographical map">${land}</svg>`;
fs.writeFileSync(
  path.join(release, "OFFLINE_PREVIEW.html"),
  fs
    .readFileSync(path.join(__dirname, "OFFLINE_PREVIEW.html"), "utf8")
    .replaceAll("__MAP__", map),
);
// Preserve redistribution notices for bundled production dependencies.
const notices = path.join(release, "licenses");
fs.mkdirSync(notices, { recursive: true });
const dependencies = JSON.parse(fs.readFileSync(path.join(root, "package.json"), "utf8")).dependencies;
for (const name of Object.keys(dependencies)) {
  const directory = path.join(root, "node_modules", name);
  if (!fs.existsSync(directory)) continue;
  for (const file of fs.readdirSync(directory)) {
    if (/^(licen[sc]e|notice|copyright)(\.|$)/i.test(file) && fs.statSync(path.join(directory, file)).isFile()) {
      fs.copyFileSync(path.join(directory, file), path.join(notices, `${name.replaceAll("/", "_")}-${file}`));
    }
  }
}
fs.writeFileSync(
  path.join(release, "START_MERIDIAN.bat"),
  '@echo off\r\nsetlocal\r\ncd /d "%~dp0"\r\nset NODE_OPTIONS=\r\nif not exist "runtime\\node.exe" (\r\n echo Missing bundled runtime. Copy the entire submission folder.\r\n echo Or open OFFLINE_PREVIEW.html directly in your browser.\r\n pause\r\n exit /b 1\r\n)\r\n"runtime\\node.exe" "runtime\\server.cjs"\r\nif errorlevel 1 pause\r\n',
);
fs.writeFileSync(
  path.join(release, "README_FIRST.txt"),
  `MERIDIAN - PORTABLE WINDOWS PRESENTATION

1. Copy this ENTIRE folder to a local folder or USB drive.
2. Double-click START_MERIDIAN.bat.
3. Keep the console window open during the presentation.
4. Stop with Ctrl+C, then close the console.

No installation, administrator access, internet or developer tools required.
Windows x64 with a modern Edge/Chrome browser is required.
Bundled Node.js ${process.version} (${process.arch}); official installed Node runtime, license in runtime.
The application is prebuilt static HTML/CSS/JavaScript, served only on 127.0.0.1.
The launcher starts at port 4273 and tries nearby ports if occupied. The console shows its actual address.
You can optionally set MERIDIAN_PORT=4275 in a command prompt before launching.

If school policy blocks .exe files or local servers:
Open OFFLINE_PREVIEW.html directly. It is an independent simplified interactive workspace.
School device execution policy cannot be guaranteed on this development computer.

The application opens on Sign in. Existing browser workspace data remains available after sign in.
Select Create account to enter personal information, complete local session verification and create a journey.
No government identity, booking or submission service is connected.
Requirements need official confirmation; optional authority links require internet.
Use non-sensitive metadata only. No document files are stored or uploaded.
Browser state is tied to the localhost address/port, not carried on the USB.

source\\ contains application source, configuration and dependency lockfile, without node_modules, caches or credentials.
Source development requires Node/npm; running the prebuilt application does not.
Release built: ${new Date().toISOString()}
`,
);
fs.writeFileSync(
  path.join(release, "BUILD_INFO.json"),
  JSON.stringify(
    {
      builtAt: new Date().toISOString(),
      node: process.version,
      architecture: process.arch,
      strategy: "Next.js static export; built-in loopback HTTP server",
    },
    null,
    2,
  ),
);
console.log(`Portable release created: ${release}`);
