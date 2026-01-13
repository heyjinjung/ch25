import { spawn } from "node:child_process";

const argv = process.argv.slice(2);
const shouldDown = argv.includes("--down");
const skipBuild = argv.includes("--skip-build");

const composeFiles = [
  "docker-compose.yml",
  "docker-compose.local.yml",
  "docker-compose.e2e.yml",
];

const baseUrl = process.env.CYPRESS_BASE_URL || "http://localhost:8080";
const defaultSpecs = "cypress/e2e/admin_global_sync.cy.ts,cypress/e2e/admin_nav_smoke.cy.ts";

const sanitizeEnv = (rawEnv) => {
  const out = {};
  for (const [k, v] of Object.entries(rawEnv ?? {})) {
    if (v === undefined || v === null) continue;
    out[k] = typeof v === "string" ? v : String(v);
  }
  return out;
};

const run = (cmd, args, opts = {}) =>
  new Promise((resolve, reject) => {
    let child;
    try {
      child = spawn(cmd, args, { stdio: "inherit", windowsHide: true, ...opts });
    } catch (err) {
      reject(
        new Error(
          `[e2e] spawn failed: ${cmd} ${args.join(" ")} (${err?.code ?? "UNKNOWN"}) ${err?.message ?? err}`,
        ),
      );
      return;
    }
    child.on("error", (err) => {
      reject(
        new Error(
          `[e2e] spawn error: ${cmd} ${args.join(" ")} (${err?.code ?? "UNKNOWN"}) ${err?.message ?? err}`,
        ),
      );
    });
    child.on("exit", (code) => {
      if (code === 0) resolve();
      else reject(new Error(`${cmd} ${args.join(" ")} failed with code ${code}`));
    });
  });

const docker = "docker";

const composeArgs = (extra) => {
  const args = ["compose"];
  for (const f of composeFiles) args.push("-f", f);
  return args.concat(extra);
};

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const runWithRetries = async (fn, { label, timeoutMs = 120_000, delayMs = 2000 } = {}) => {
  const deadlineMs = Date.now() + timeoutMs;
  let lastError;
  while (Date.now() < deadlineMs) {
    try {
      await fn();
      return;
    } catch (err) {
      lastError = err;
      if (label) {
        // eslint-disable-next-line no-console
        console.log(`[e2e] retrying: ${label}`);
      }
      await sleep(delayMs);
    }
  }
  throw lastError ?? new Error(label ? `[e2e] timeout: ${label}` : "[e2e] timeout");
};

const waitForHealth = async () => {
  const healthUrl = new URL("/health", baseUrl).toString();
  const deadlineMs = Date.now() + 120_000;
  // eslint-disable-next-line no-console
  console.log(`[e2e] waiting for health: ${healthUrl}`);
  while (Date.now() < deadlineMs) {
    try {
      const res = await fetch(healthUrl, { method: "GET" });
      if (res.ok) return;
    } catch {
      // ignore
    }
    await sleep(1000);
  }
  throw new Error(`[e2e] health check timeout: ${healthUrl}`);
};

const waitForMysql = async () => {
  // Use container env ($MYSQL_ROOT_PASSWORD) to avoid duplicating secrets here.
  await runWithRetries(
    () =>
      run(docker, composeArgs(["exec", "-T", "db", "sh", "-lc", "mysqladmin ping -h localhost -u root -p$MYSQL_ROOT_PASSWORD --silent"])),
    { label: "mysql ready" },
  );
};

const shouldRunAllSpecs = () => {
  if (argv.includes("--all-specs")) return true;
  const raw = process.env.E2E_ALL_SPECS;
  if (!raw) return false;
  return ["1", "true", "yes", "y", "on"].includes(String(raw).trim().toLowerCase());
};

const main = async () => {
  try {
    // 1) Start docker stack
    const upArgs = ["up", "-d"];
    if (!skipBuild) upArgs.push("--build");
    await run(docker, composeArgs(upArgs));

    // 2) Wait nginx health
    await waitForHealth();

    // 2.5) Wait MySQL readiness (nginx /health is static in local config)
    await waitForMysql();

    // 3) Apply migrations
    await runWithRetries(
      () => run(docker, composeArgs(["exec", "-T", "backend", "alembic", "upgrade", "head"])),
      { label: "alembic upgrade" },
    );

    // 3.5) Seed admin user for e2e (idempotent)
    await runWithRetries(
      () => run(docker, composeArgs(["exec", "-T", "backend", "python", "scripts/seed_admin_v3.py"])),
      { label: "seed admin" },
    );

    // 4) Run Cypress (headless)
    const env = sanitizeEnv({ ...process.env, CYPRESS_BASE_URL: baseUrl });
    if (process.platform === "win32") {
      // On Windows, spawning .cmd directly can throw EINVAL depending on environment.
      const args = shouldRunAllSpecs()
        ? ["/d", "/s", "/c", "npm", "run", "test:e2e"]
        : [
            "/d",
            "/s",
            "/c",
            "npm",
            "run",
            "test:e2e",
            "--",
            "--spec",
            defaultSpecs,
          ];
      await run("cmd.exe", args, { env });
    } else {
      const args = shouldRunAllSpecs()
        ? ["run", "test:e2e"]
        : ["run", "test:e2e", "--", "--spec", defaultSpecs];
      await run("npm", args, { env });
    }
  } finally {
    if (shouldDown) {
      await run(docker, composeArgs(["down", "-v"]));
    }
  }
};

main().catch((err) => {
  // eslint-disable-next-line no-console
  console.error(err);
  process.exit(1);
});
