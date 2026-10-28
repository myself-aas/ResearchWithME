import { describe, expect, it } from 'vitest';
import { safeNextPath } from '@/lib/safe-redirect';

describe('safeNextPath', () => {
  it('keeps same-origin paths with their query', () => {
    expect(safeNextPath('/dashboard/edit/42?tab=meta')).toBe('/dashboard/edit/42?tab=meta');
    expect(safeNextPath(['/bookmarks', '/ignored'])).toBe('/bookmarks');
  });

  it('rejects absolute, protocol-relative, and backslash URLs', () => {
    expect(safeNextPath('https://evil.example')).toBe('/dashboard');
    expect(safeNextPath('//evil.example')).toBe('/dashboard');
    expect(safeNextPath('/\\evil.example')).toBe('/dashboard');
  });

  it('never loops back into the sign-in flow', () => {
    expect(safeNextPath('/login?next=/dashboard')).toBe('/dashboard');
    expect(safeNextPath('/auth/callback?code=x', '/')).toBe('/');
  });

  it('falls back when empty', () => {
    expect(safeNextPath(undefined)).toBe('/dashboard');
    expect(safeNextPath('', '/')).toBe('/');
  });
});
