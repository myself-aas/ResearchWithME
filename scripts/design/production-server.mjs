import { spawn } from 'node:child_process';

const DEFAULT_STARTUP_TIMEOUT_MS = 30000;

/** Own the entire process group so timeouts do not leave a server behind. */
function stopServer(child) {
  if (!child.pid) return;
  try {
    process.kill(-child.pid, 'SIGTERM');
  } catch (error) {
    if (error.code !== 'ESRCH') throw error;
  }
}

export function waitForServer(child, timeoutMs = DEFAULT_STARTUP_TIMEOUT_MS, readiness = /Ready in/) {
  return new Promise((resolve, reject) => {
    let output = '';
    const cleanup = () => {
      clearTimeout(timer);
      child.off('error', onError);
      child.off('exit', onExit);
      child.stdout.off('data', onOutput);
      child.stderr.off('data', onOutput);
    };
    const finish = (error) => {
      cleanup();
      if (error) reject(error);
      else resolve();
    };
    const onError = error => finish(error);
    const onExit = code => finish(new Error(`Production server exited before readiness (${code}).\n${output}`));
    const onOutput = data => {
      output = (output + data.toString()).slice(-16000);
      if (readiness.test(output)) finish();
    };
    const timer = setTimeout(() => finish(new Error(`Production server startup timed out.\n${output}`)), timeoutMs);
    child.once('error', onError);
    child.once('exit', onExit);
    child.stdout.on('data', onOutput);
    child.stderr.on('data', onOutput);
  });
}

export async function withManagedServer(check, { args, port, timeoutMs, readiness, env = {} }) {
  const child = spawn(process.execPath, args, {
    env: { ...process.env, HOSTNAME: '0.0.0.0', PORT: String(port), ...env },
    stdio: ['ignore', 'pipe', 'pipe'],
    detached: true,
  });
  try {
    await waitForServer(child, timeoutMs, readiness);
    return await check(`http://localhost:${port}`);
  } finally {
    stopServer(child);
  }
}

export function withProductionServer(check, { port = 3101, timeoutMs } = {}) {
  return withManagedServer(check, { args: ['scripts/standalone-serve.mjs'], port, timeoutMs });
}
