import { EventEmitter } from 'node:events';
import { PassThrough } from 'node:stream';
import { describe, expect, it } from 'vitest';
import { waitForServer } from '@/scripts/design/production-server.mjs';

function fakeServer() {
  return Object.assign(new EventEmitter(), { stdout: new PassThrough(), stderr: new PassThrough() });
}

describe('production server readiness', () => {
  it('accepts a readiness marker split across output chunks', async () => {
    const server = fakeServer();
    const ready = waitForServer(server, 500);
    server.stdout.write('Starting…\nRea');
    server.stdout.write('dy in 100ms\n');
    await expect(ready).resolves.toBeUndefined();
    expect(server.listenerCount('exit')).toBe(0);
    expect(server.stdout.listenerCount('data')).toBe(0);
  });

  it('includes diagnostic stderr when startup exits', async () => {
    const server = fakeServer();
    const ready = waitForServer(server, 500);
    server.stderr.write('Address already in use');
    server.emit('exit', 1);
    await expect(ready).rejects.toThrow(/Address already in use/);
  });

  it('rejects spawn failures instead of waiting until the deadline', async () => {
    const server = fakeServer();
    const ready = waitForServer(server, 500);
    server.emit('error', new Error('Could not spawn Node'));
    await expect(ready).rejects.toThrow('Could not spawn Node');
    expect(server.listenerCount('exit')).toBe(0);
  });

  it('times out and removes all its listeners', async () => {
    const server = fakeServer();
    await expect(waitForServer(server, 10)).rejects.toThrow(/timed out/);
    expect(server.listenerCount('error')).toBe(0);
    expect(server.stdout.listenerCount('data')).toBe(0);
    expect(server.stderr.listenerCount('data')).toBe(0);
  });
});
