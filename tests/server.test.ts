import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { spawn } from "node:child_process";
import { once } from "node:events";
import { createServer } from "node:net";

test("portable server starts on a free loopback port even when the default is occupied", { timeout: 15000 }, async t => {
  const blocker = createServer();
  await new Promise<void>((resolve, reject) => {
    blocker.once("error", (error: NodeJS.ErrnoException) => error.code === "EADDRINUSE" ? resolve() : reject(error));
    blocker.listen(4273, "127.0.0.1", resolve);
  });
  t.after(() => { if (blocker.listening) blocker.close(); });
  fs.mkdirSync("artifacts", { recursive: true });
  const directory = fs.mkdtempSync(path.resolve("artifacts/portable-server-test-"));
  fs.mkdirSync(path.join(directory, "runtime"));
  fs.mkdirSync(path.join(directory, "application"));
  fs.copyFileSync("scripts/server.cjs", path.join(directory, "runtime/server.cjs"));
  fs.writeFileSync(path.join(directory, "application/index.html"), "<h1>Offline fixture</h1>");
  const env: NodeJS.ProcessEnv = { ...process.env, MERIDIAN_NO_BROWSER: "1" };
  delete env.MERIDIAN_PORT;
  const child = spawn(process.execPath, [path.join(directory, "runtime/server.cjs")], { env, stdio: ["ignore", "pipe", "pipe"] });
  t.after(async () => {
    if (child.exitCode === null) { const exited = once(child, "exit"); child.kill(); await exited; }
    fs.rmSync(directory, { recursive: true, force: true });
  });
  const url = await new Promise<string>((resolve, reject) => {
    let output = "";
    child.stdout.on("data", chunk => { output += chunk; const match = output.match(/ready at (http:\/\/127\.0\.0\.1:\d+)/); if (match) resolve(match[1]); });
    child.stderr.on("data", chunk => { output += chunk; });
    child.on("exit", code => reject(new Error(`Server exited ${code}: ${output}`)));
    child.on("error", reject);
  });
  const response = await fetch(url);
  assert.notEqual(new URL(url).port, "4273");
  assert.equal(response.status, 200);
  assert.match(await response.text(), /Offline fixture/);
});

test("static server can serve a production export supplied as a CLI argument", { timeout: 15000 }, async t => {
  fs.mkdirSync("artifacts", { recursive: true });
  const directory = fs.mkdtempSync(path.resolve("artifacts/export-server-test-"));
  fs.writeFileSync(path.join(directory, "index.html"), "<h1>Production export fixture</h1>");
  const child = spawn(process.execPath, ["scripts/server.cjs", directory], {
    env: { ...process.env, MERIDIAN_NO_BROWSER: "1" },
    stdio: ["ignore", "pipe", "pipe"],
  });
  t.after(async () => {
    if (child.exitCode === null) { const exited = once(child, "exit"); child.kill(); await exited; }
    fs.rmSync(directory, { recursive: true, force: true });
  });
  const url = await new Promise<string>((resolve, reject) => {
    child.stdout.on("data", chunk => {
      const match = String(chunk).match(/ready at (http:\/\/127\.0\.0\.1:\d+)/);
      if (match) resolve(match[1]);
    });
    child.on("error", reject);
    child.on("exit", code => reject(new Error(`Server exited ${code}`)));
  });
  const response = await fetch(url);
  assert.equal(response.status, 200);
  assert.match(await response.text(), /Production export fixture/);
});
