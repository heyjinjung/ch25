import { spawn } from "node:child_process";

const argv = process.argv.slice(2);

const sanitizeEnv = (rawEnv) => {
  const out = {};
  for (const [k, v] of Object.entries(rawEnv ?? {})) {
    // On Windows, process.env may include drive pseudo-vars like "=C:" which can crash spawn with EINVAL.
    if (!k || k.startsWith("=") || k.includes("\0")) continue;
    if (v === undefined || v === null) continue;
    out[k] = typeof v === "string" ? v : String(v);
  }
  return out;
};

const env = sanitizeEnv({ ...process.env });

// Cypress bundles Electron. If these env vars are set globally, Electron may run in "node" mode
// and Cypress will fail with "bad option: --smoke-test"/cache errors.
delete env.ELECTRON_RUN_AS_NODE;
delete env.ELECTRON_NO_ATTACH_CONSOLE;

let child;
try {
  if (process.platform === "win32") {
    // Spawning .cmd directly can throw EINVAL depending on the environment; use cmd.exe as a stable shim.
    child = spawn("cmd.exe", ["/d", "/s", "/c", "npx", "cypress", ...argv], {
      stdio: "inherit",
      windowsHide: true,
      env,
    });
  } else {
    const npxCmd = "npx";
    child = spawn(npxCmd, ["cypress", ...argv], { stdio: "inherit", env });
  }
} catch (err) {
  // eslint-disable-next-line no-console
  console.error(
    new Error(
      `[cypress] spawn failed (${err?.code ?? "UNKNOWN"}) ${err?.message ?? err}`,
    ),
  );
  process.exit(1);
}

child.on("error", (err) => {
  // eslint-disable-next-line no-console
  console.error(
    new Error(
      `[cypress] spawn error (${err?.code ?? "UNKNOWN"}) ${err?.message ?? err}`,
    ),
  );
  process.exit(1);
});

child.on("exit", (code) => {
  process.exit(typeof code === "number" ? code : 1);
});

