import { spawn } from "node:child_process";

const argv = process.argv.slice(2);
const env = { ...process.env };

// Cypress bundles Electron. If these env vars are set globally, Electron may run in "node" mode
// and Cypress will fail with "bad option: --smoke-test"/cache errors.
delete env.ELECTRON_RUN_AS_NODE;
delete env.ELECTRON_NO_ATTACH_CONSOLE;

const npxCmd = process.platform === "win32" ? "npx.cmd" : "npx";
const child = spawn(npxCmd, ["cypress", ...argv], { stdio: "inherit", env });

child.on("exit", (code) => {
  process.exit(typeof code === "number" ? code : 1);
});

