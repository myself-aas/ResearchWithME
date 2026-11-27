import { describe, expect, it } from 'vitest';
import { GET } from '@/app/.well-known/agent-card.json/route';
import { SITE } from '@/lib/site';

/**
 * A2A Agent Card (https://a2a-protocol.org/latest/specification/) served at
 * the well-known URI `/.well-known/agent-card.json`. The route is a pure
 * object builder, so these tests invoke the handler directly and assert the
 * card against the schema: identity fields, supportedInterfaces,
 * capabilities, and skills.
 */
interface Card {
  name: string;
  version: string;
  description: string;
  supportedInterfaces: { url: string; protocolBinding: string; protocolVersion: string }[];
  capabilities: { streaming: boolean; pushNotifications: boolean };
  defaultInputModes: string[];
  defaultOutputModes: string[];
  skills: { id: string; name: string; description: string; tags: string[] }[];
}

async function serveCard(): Promise<{ response: Response; card: Card }> {
  const response = GET();
  const body = await response.text();
  return { response, card: JSON.parse(body) as Card };
}

describe('A2A Agent Card', () => {
  it('serves JSON with HTTP 200 and JSON content type', async () => {
    const { response } = await serveCard();
    expect(response.status).toBe(200);
    expect(response.headers.get('content-type')).toContain('application/json');
  });

  it('is cached like the other machine-readable artifacts', async () => {
    const { response } = await serveCard();
    expect(response.headers.get('cache-control')).toContain('max-age=3600');
  });

  it('includes the required identity fields', async () => {
    const { card } = await serveCard();
    expect(card.name).toBe(SITE.name);
    expect(typeof card.version).toBe('string');
    expect(card.version.length).toBeGreaterThan(0);
    expect(typeof card.description).toBe('string');
    expect(card.description.length).toBeGreaterThan(0);
  });

  it('declares supportedInterfaces with a service URL and transport protocol', async () => {
    const { card } = await serveCard();
    expect(Array.isArray(card.supportedInterfaces)).toBe(true);
    expect(card.supportedInterfaces.length).toBeGreaterThan(0);
    for (const iface of card.supportedInterfaces) {
      expect(iface.url).toBe(SITE.url);
      expect(iface.url).toMatch(/^https:\/\//);
      expect(iface.protocolBinding).toBe('HTTP+JSON');
      expect(iface.protocolVersion).toBe('1.0');
    }
  });

  it('includes capabilities', async () => {
    const { card } = await serveCard();
    expect(card.capabilities).toBeDefined();
    expect(typeof card.capabilities.streaming).toBe('boolean');
    expect(typeof card.capabilities.pushNotifications).toBe('boolean');
  });

  it('lists default input and output modes as media types', async () => {
    const { card } = await serveCard();
    expect(card.defaultInputModes.length).toBeGreaterThan(0);
    expect(card.defaultOutputModes.length).toBeGreaterThan(0);
  });

  it('lists skills with id, name, and description', async () => {
    const { card } = await serveCard();
    expect(card.skills.length).toBeGreaterThan(0);
    const ids = new Set<string>();
    for (const skill of card.skills) {
      expect(typeof skill.id).toBe('string');
      expect(skill.id.length).toBeGreaterThan(0);
      expect(typeof skill.name).toBe('string');
      expect(skill.name.length).toBeGreaterThan(0);
      expect(typeof skill.description).toBe('string');
      expect(skill.description.length).toBeGreaterThan(0);
      ids.add(skill.id);
    }
    expect(ids.size).toBe(card.skills.length);
  });

  it('names skills that map to real machine-readable endpoints', async () => {
    const { card } = await serveCard();
    const ids = card.skills.map((skill) => skill.id);
    // Each advertised skill corresponds to a real, working endpoint or
    // interface on the site.
    expect(ids).toContain('read-article-markdown');
    expect(ids).toContain('discover-api-surface');
    expect(ids).toContain('search-archive');
    expect(ids).toContain('subscribe-feed');
    expect(ids).toContain('read-llms-index');
  });

  it('is valid JSON and serialises without a name collision', async () => {
    const { card } = await serveCard();
    // Round-trip: the card must survive JSON serialisation intact.
    const roundTrip = JSON.parse(JSON.stringify(card)) as Card;
    expect(roundTrip.name).toBe(card.name);
    expect(roundTrip.skills).toHaveLength(card.skills.length);
  });
});
