/**
 * Aadhirai Pharma — Windows Service Installer
 * Run as Administrator: node deploy/setup-service.js [install|uninstall|status]
 */

import { Service } from "node-windows";
import { fileURLToPath } from "url";
import path from "path";
import fs from "fs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const appRoot = path.resolve(__dirname, "..");
const entryPoint = path.join(appRoot, "dist", "index.cjs");

if (!fs.existsSync(entryPoint)) {
  console.error(
    `[ERROR] Built file not found: ${entryPoint}\nRun "npm run build" first.`
  );
  process.exit(1);
}

const svc = new Service({
  name: "AadhiraiPharma",
  description: "Aadhirai Pharma Management System — Local Server",
  script: entryPoint,
  nodeOptions: [],
  env: [
    { name: "NODE_ENV", value: "production" },
    // The service reads .env from the app root automatically (dotenv)
  ],
  workingDirectory: appRoot,
  // Restart on crash, up to 3 times within 60 seconds
  wait: 2,
  grow: 0.5,
  maxRestarts: 3,
});

svc.on("install", () => {
  svc.start();
  console.log("[OK] Service installed and started.");
  console.log("[OK] Access the app at: http://localhost:3000");
});

svc.on("uninstall", () => {
  console.log("[OK] Service uninstalled.");
});

svc.on("alreadyinstalled", () => {
  console.log("[INFO] Service is already installed.");
});

svc.on("start", () => {
  console.log("[OK] Service started.");
});

svc.on("stop", () => {
  console.log("[OK] Service stopped.");
});

svc.on("error", (err) => {
  console.error("[ERROR]", err);
});

const command = process.argv[2] || "install";

switch (command) {
  case "install":
    console.log("[...] Installing Windows Service: AadhiraiPharma ...");
    svc.install();
    break;
  case "uninstall":
    console.log("[...] Uninstalling Windows Service: AadhiraiPharma ...");
    svc.uninstall();
    break;
  case "start":
    svc.start();
    break;
  case "stop":
    svc.stop();
    break;
  case "status":
    console.log("Service exists:", svc.exists);
    break;
  default:
    console.log("Usage: node deploy/setup-service.js [install|uninstall|start|stop|status]");
}
