import path from "path";
import fs from "fs";
import { spawn } from "child_process";
import { storage } from "./storage";

// Same pkg-aware idiom used for install-status.txt and logs/.
const backupDir = path.join(
  (process as any).pkg ? path.dirname(process.execPath) : process.cwd(),
  "backup",
);

function ensureBackupDir() {
  fs.mkdirSync(backupDir, { recursive: true });
}

const PG_DUMP_BIN = process.platform === "win32" ? "pg_dump.exe" : "pg_dump";

// The Windows installer writes PG_BIN_PATH to .env after detecting the
// client's PostgreSQL install location (same search it already does for
// psql.exe). On Linux, pg_dump is normally already on PATH (installed via
// apt/yum's postgresql-client package), so no directory search is needed —
// an empty string tells spawn() to resolve it from PATH directly.
function findPgBinPath(): string | null {
  const configured = process.env.PG_BIN_PATH;
  if (configured && fs.existsSync(path.join(configured, PG_DUMP_BIN))) {
    return configured;
  }
  if (process.platform !== "win32") {
    return "";
  }
  for (const version of [18, 17, 16, 15]) {
    const dir = `C:\\Program Files\\PostgreSQL\\${version}\\bin`;
    if (fs.existsSync(path.join(dir, PG_DUMP_BIN))) {
      return dir;
    }
  }
  return null;
}

function parseDatabaseUrl(databaseUrl: string) {
  const parsed = new URL(databaseUrl);
  return {
    host: parsed.hostname,
    port: parsed.port || "5432",
    user: decodeURIComponent(parsed.username),
    password: decodeURIComponent(parsed.password),
    database: parsed.pathname.replace(/^\//, ""),
  };
}

export interface BackupResult {
  success: boolean;
  file?: string;
  error?: string;
}

export async function runBackup(): Promise<BackupResult> {
  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) {
    return { success: false, error: "DATABASE_URL is not set" };
  }

  const binPath = findPgBinPath();
  if (binPath === null) {
    return {
      success: false,
      error: `${PG_DUMP_BIN} not found. Set PG_BIN_PATH in .env to your PostgreSQL bin folder.`,
    };
  }

  ensureBackupDir();
  const { host, port, user, password, database } = parseDatabaseUrl(databaseUrl);
  const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
  const outFile = path.join(backupDir, `${database}-${timestamp}.sql`);

  const pgDumpCmd = binPath ? path.join(binPath, PG_DUMP_BIN) : PG_DUMP_BIN;

  return new Promise((resolve) => {
    const proc = spawn(
      pgDumpCmd,
      ["-h", host, "-p", port, "-U", user, "-F", "p", "-f", outFile, database],
      { env: { ...process.env, PGPASSWORD: password }, windowsHide: true },
    );

    let stderr = "";
    proc.stderr?.on("data", (chunk) => { stderr += chunk.toString(); });

    proc.on("error", (err) => {
      resolve({ success: false, error: err.message });
    });

    proc.on("close", (code) => {
      if (code === 0 && fs.existsSync(outFile)) {
        cleanupOldBackups();
        resolve({ success: true, file: outFile });
      } else {
        resolve({ success: false, error: stderr.trim() || `pg_dump exited with code ${code}` });
      }
    });
  });
}

function cleanupOldBackups(keep = 30) {
  try {
    const files = fs.readdirSync(backupDir)
      .filter((f) => f.endsWith(".sql"))
      .map((f) => ({ name: f, time: fs.statSync(path.join(backupDir, f)).mtimeMs }))
      .sort((a, b) => b.time - a.time);

    for (const file of files.slice(keep)) {
      fs.unlinkSync(path.join(backupDir, file.name));
    }
  } catch (err) {
    console.error("[backup] cleanup of old backups failed:", err);
  }
}

export function listBackups() {
  ensureBackupDir();
  return fs.readdirSync(backupDir)
    .filter((f) => f.endsWith(".sql"))
    .map((f) => {
      const stat = fs.statSync(path.join(backupDir, f));
      return { name: f, size: stat.size, createdAt: stat.mtime };
    })
    .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
}

const FREQUENCY_MS: Record<string, number> = {
  daily: 24 * 60 * 60 * 1000,
  weekly: 7 * 24 * 60 * 60 * 1000,
  monthly: 30 * 24 * 60 * 60 * 1000,
};

let schedulerStarted = false;

export function startBackupScheduler() {
  if (schedulerStarted) return;
  schedulerStarted = true;
  // Check hourly whether a scheduled backup is due, rather than trying to
  // compute an exact next-run timer - simpler, and self-corrects if the
  // app was off (a Windows service can be stopped/started at any time)
  // when a backup would otherwise have been due.
  setInterval(checkAndRunScheduledBackup, 60 * 60 * 1000);
  setTimeout(checkAndRunScheduledBackup, 30 * 1000);
}

async function checkAndRunScheduledBackup() {
  try {
    const freqSetting = await storage.getSetting("backup_frequency");
    const frequency = freqSetting?.value || "off";
    const intervalMs = FREQUENCY_MS[frequency];
    if (!intervalMs) return;

    const lastRunSetting = await storage.getSetting("backup_last_run");
    const lastRun = lastRunSetting ? new Date(lastRunSetting.value).getTime() : 0;

    if (Date.now() < lastRun + intervalMs) return;

    console.log(`[backup] Scheduled ${frequency} backup is due, starting...`);
    const result = await runBackup();
    await storage.upsertSetting("backup_last_run", new Date().toISOString());
    await storage.upsertSetting("backup_last_status", result.success ? "success" : `error: ${result.error}`);

    if (result.success) {
      console.log(`[backup] Scheduled backup completed: ${result.file}`);
    } else {
      console.error(`[backup] Scheduled backup failed: ${result.error}`);
    }
  } catch (err) {
    console.error("[backup] scheduler check failed:", err);
  }
}
