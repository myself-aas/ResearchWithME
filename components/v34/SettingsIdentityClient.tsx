'use client';

import { useEffect, useState } from 'react';
import {
  CheckCircle2,
  Download,
  Laptop,
  Link2,
  ShieldAlert,
  Trash2,
} from 'lucide-react';
import { performLogoutLocalWipe } from '@/lib/persistence/logout-wipe';
import type { ConfiguredLanding } from '@/lib/v34/landing';

interface DeviceItem {
  id: string;
  label: string;
  platform: string;
  revokedAt?: string | null;
}

const LANDING_OPTIONS: Array<{ value: ConfiguredLanding; label: string; description: string }> = [
  { value: 'research-os', label: 'Personal Research OS (/research-os)', description: 'Attention queue, continue working, goals, and library.' },
  { value: 'feed', label: 'Research Feed (/feed)', description: 'Latest scholarly contributions, evidence, and peer reviews.' },
  { value: 'library', label: 'Research Library (/library)', description: 'Saved sources, collections, and reading progress.' },
  { value: 'projects', label: 'Research Projects (/projects)', description: 'Workspace-governed research projects and milestones.' },
  { value: 'dashboard', label: 'Editorial Dashboard (/dashboard)', description: 'Editorial management and publication studio.' },
];

export default function SettingsIdentityClient() {
  const [orcid, setOrcid] = useState('');
  const [githubHandle, setGithubHandle] = useState('');
  const [institution, setInstitution] = useState('');
  const [roleTitle, setRoleTitle] = useState('');
  const [expertiseSlug, setExpertiseSlug] = useState('reproducible-ml');
  const [expertiseLabel, setExpertiseLabel] = useState('');
  const [landing, setLanding] = useState<ConfiguredLanding>('research-os');
  const [devices, setDevices] = useState<DeviceItem[]>([]);
  const [deviceLabel, setDeviceLabel] = useState('');
  const [tombstonePhrase, setTombstonePhrase] = useState('');
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    let active = true;
    fetch('/api/devices')
      .then((res) => (res.ok ? res.json() : null))
      .then((data: { devices?: DeviceItem[] } | null) => {
        if (active && data?.devices) setDevices(data.devices);
      })
      .catch(() => {});
    return () => {
      active = false;
    };
  }, []);

  async function runAction(fn: () => Promise<void>) {
    setBusy(true);
    setStatusMessage(null);
    try {
      await fn();
    } catch {
      setStatusMessage('Network error communicating with ResearchWithME API.');
    } finally {
      setBusy(false);
    }
  }

  async function handleConnectOrcid(e: React.FormEvent) {
    e.preventDefault();
    if (!orcid.trim()) return;
    await runAction(async () => {
      const res = await fetch('/api/me/orcid/connect', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ orcid: orcid.trim() }),
      });
      const data = (await res.json()) as { connected?: boolean; error?: string };
      setStatusMessage(
        res.ok && data.connected
          ? 'ORCID iD format validated and bound to your profile.'
          : data.error || 'Sign in to bind your ORCID iD.',
      );
    });
  }

  async function handleConnectGithub(e: React.FormEvent) {
    e.preventDefault();
    if (!githubHandle.trim()) return;
    await runAction(async () => {
      const res = await fetch('/api/me/github/connect', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ githubHandle: githubHandle.trim() }),
      });
      const data = (await res.json()) as { connected?: boolean; error?: string };
      setStatusMessage(
        res.ok && data.connected
          ? 'GitHub contributor handle connected.'
          : data.error || 'Sign in to connect your GitHub handle.',
      );
    });
  }

  async function handleAddAffiliation(e: React.FormEvent) {
    e.preventDefault();
    if (!institution.trim() || !roleTitle.trim()) return;
    await runAction(async () => {
      const res = await fetch('/api/me/affiliations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          institution: institution.trim(),
          role: roleTitle.trim(),
          primary: true,
        }),
      });
      const data = (await res.json()) as { affiliation?: { id: string }; error?: string };
      if (res.ok && data.affiliation) {
        setInstitution('');
        setRoleTitle('');
        setStatusMessage('Institutional affiliation added.');
      } else {
        setStatusMessage(data.error || 'Sign in to add an affiliation.');
      }
    });
  }

  async function handleAddExpertise(e: React.FormEvent) {
    e.preventDefault();
    if (!expertiseLabel.trim()) return;
    await runAction(async () => {
      const res = await fetch('/api/me/expertise', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          topicSlug: expertiseSlug.trim() || 'research-methods',
          label: expertiseLabel.trim(),
        }),
      });
      const data = (await res.json()) as { expertise?: { id: string }; error?: string };
      if (res.ok && data.expertise) {
        setExpertiseLabel('');
        setStatusMessage('Domain expertise tag added.');
      } else {
        setStatusMessage(data.error || 'Sign in to manage expertise.');
      }
    });
  }

  async function handleSaveLanding(nextLanding: ConfiguredLanding) {
    setLanding(nextLanding);
    if (typeof document !== 'undefined') {
      document.cookie = `rwm_landing=${encodeURIComponent(nextLanding)}; Path=/; Max-Age=31536000; SameSite=Lax`;
    }
    await runAction(async () => {
      const res = await fetch('/api/dashboard/preferences', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          defaultLanding: nextLanding === 'research-os' ? 'dashboard' : nextLanding,
        }),
      });
      setStatusMessage(
        res.ok
          ? `Default post-sign-in landing updated to ${nextLanding}.`
          : `Saved local landing preference (${nextLanding}). Sign in to sync across devices.`,
      );
    });
  }

  async function handleRegisterDevice(e: React.FormEvent) {
    e.preventDefault();
    if (!deviceLabel.trim()) return;
    await runAction(async () => {
      const res = await fetch('/api/devices', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ label: deviceLabel.trim(), platform: 'web' }),
      });
      const data = (await res.json()) as { device?: DeviceItem; error?: string };
      if (res.ok && data.device) {
        setDevices((prev) => [data.device!, ...prev]);
        setDeviceLabel('');
        setStatusMessage('Device registered for offline sync tracking.');
      } else {
        setStatusMessage(data.error || 'Sign in to register this device.');
      }
    });
  }

  async function handleRevokeDevice(id: string) {
    await runAction(async () => {
      const res = await fetch(`/api/devices/${encodeURIComponent(id)}`, { method: 'DELETE' });
      if (res.ok) {
        setDevices((prev) => prev.filter((d) => d.id !== id));
        setStatusMessage('Device revoked and associated push subscriptions cleared.');
      }
    });
  }

  async function handleLocalWipe() {
    await runAction(async () => {
      const result = await performLogoutLocalWipe({
        clearLocalDrafts: true,
        unregisterPush: true,
        clearServiceWorkerCaches: true,
      });
      setStatusMessage(
        `Local offline wipe complete (drafts cleared: ${result.draftsCleared ? 'yes' : 'no'}, runtime caches purged: ${result.cachesCleared}).`,
      );
    });
  }

  async function handleTombstoneAccount(e: React.FormEvent) {
    e.preventDefault();
    if (tombstonePhrase.trim() !== 'DELETE MY ACCOUNT') return;
    await runAction(async () => {
      const res = await fetch('/api/me', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          confirmationPhrase: tombstonePhrase.trim(),
          retainCitationTombstones: true,
        }),
      });
      const data = (await res.json()) as { deleted?: boolean; error?: string };
      if (res.ok && data.deleted) {
        await performLogoutLocalWipe();
        setTombstonePhrase('');
        setStatusMessage(
          'Account tombstone recorded. Devices revoked while scholarly citation integrity is preserved.',
        );
      } else {
        setStatusMessage(data.error || 'Sign in to execute account deletion.');
      }
    });
  }

  return (
    <div className="mt-10 space-y-10">
      {statusMessage && (
        <p
          role="status"
          className="rounded-lg border border-brand/40 bg-brand/5 px-4 py-3 text-sm font-medium text-brand"
        >
          {statusMessage}
        </p>
      )}

      {/* 1. Scholarly Identity & External Identifiers */}
      <section aria-labelledby="identity-heading" className="border-t border-line pt-6 space-y-5">
        <div>
          <h2 id="identity-heading" className="font-serif text-xl font-bold text-ink">
            Scholarly Identity &amp; Affiliations
          </h2>
          <p className="mt-1 text-sm text-ink-secondary">
            Bind persistent researcher identifiers (ORCID, GitHub), institutional affiliations, and
            canonical domain expertise.
          </p>
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          <form onSubmit={handleConnectOrcid} className="rounded-xl border border-line bg-surface p-4 space-y-3">
            <label htmlFor="settings-orcid" className="block text-xs font-semibold text-ink">
              ORCID iD (0000-0000-0000-000X)
            </label>
            <input
              id="settings-orcid"
              type="text"
              dir="ltr"
              value={orcid}
              onChange={(e) => setOrcid(e.target.value)}
              placeholder="0000-0002-1825-0097"
              className="h-11 w-full rounded-lg border border-line bg-canvas px-3 font-mono text-sm text-ink"
            />
            <button
              type="submit"
              disabled={busy || !orcid.trim()}
              className="inline-flex min-h-11 items-center gap-1.5 rounded-lg bg-brand px-4 py-2 text-xs font-semibold text-on-primary hover:opacity-90 disabled:opacity-50"
            >
              <Link2 className="h-4 w-4" aria-hidden="true" />
              Connect ORCID
            </button>
          </form>

          <form onSubmit={handleConnectGithub} className="rounded-xl border border-line bg-surface p-4 space-y-3">
            <label htmlFor="settings-github" className="block text-xs font-semibold text-ink">
              GitHub Contributor Handle
            </label>
            <input
              id="settings-github"
              type="text"
              dir="ltr"
              value={githubHandle}
              onChange={(e) => setGithubHandle(e.target.value)}
              placeholder="github-username"
              className="h-11 w-full rounded-lg border border-line bg-canvas px-3 font-mono text-sm text-ink"
            />
            <button
              type="submit"
              disabled={busy || !githubHandle.trim()}
              className="inline-flex min-h-11 items-center gap-1.5 rounded-lg border border-line bg-canvas px-4 py-2 text-xs font-semibold text-ink hover:border-brand disabled:opacity-50"
            >
              <Link2 className="h-4 w-4" aria-hidden="true" />
              Connect GitHub
            </button>
          </form>
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          <form onSubmit={handleAddAffiliation} className="rounded-xl border border-line bg-surface p-4 space-y-3">
            <p className="text-xs font-semibold text-ink">Add Institutional Affiliation</p>
            <label className="sr-only" htmlFor="settings-institution">
              Institution name
            </label>
            <input
              id="settings-institution"
              type="text"
              value={institution}
              onChange={(e) => setInstitution(e.target.value)}
              placeholder="Institution (e.g. Dhaka Research Institute)"
              className="h-11 w-full rounded-lg border border-line bg-canvas px-3 text-sm text-ink"
            />
            <label className="sr-only" htmlFor="settings-role">
              Role or department
            </label>
            <input
              id="settings-role"
              type="text"
              value={roleTitle}
              onChange={(e) => setRoleTitle(e.target.value)}
              placeholder="Role (e.g. Research Fellow)"
              className="h-11 w-full rounded-lg border border-line bg-canvas px-3 text-sm text-ink"
            />
            <button
              type="submit"
              disabled={busy || !institution.trim() || !roleTitle.trim()}
              className="inline-flex min-h-11 items-center rounded-lg border border-line bg-canvas px-4 py-2 text-xs font-semibold text-ink hover:border-brand disabled:opacity-50"
            >
              Save Affiliation
            </button>
          </form>

          <form onSubmit={handleAddExpertise} className="rounded-xl border border-line bg-surface p-4 space-y-3">
            <p className="text-xs font-semibold text-ink">Add Canonical Expertise Tag</p>
            <label className="sr-only" htmlFor="settings-topic-slug">
              Topic slug
            </label>
            <input
              id="settings-topic-slug"
              type="text"
              dir="ltr"
              value={expertiseSlug}
              onChange={(e) => setExpertiseSlug(e.target.value)}
              placeholder="Topic slug (e.g. reproducible-ml)"
              className="h-11 w-full rounded-lg border border-line bg-canvas px-3 font-mono text-xs text-ink"
            />
            <label className="sr-only" htmlFor="settings-expertise-label">
              Expertise description
            </label>
            <input
              id="settings-expertise-label"
              type="text"
              value={expertiseLabel}
              onChange={(e) => setExpertiseLabel(e.target.value)}
              placeholder="Expertise label (e.g. Evaluation & RLHF)"
              className="h-11 w-full rounded-lg border border-line bg-canvas px-3 text-sm text-ink"
            />
            <button
              type="submit"
              disabled={busy || !expertiseLabel.trim()}
              className="inline-flex min-h-11 items-center rounded-lg border border-line bg-canvas px-4 py-2 text-xs font-semibold text-ink hover:border-brand disabled:opacity-50"
            >
              Add Expertise
            </button>
          </form>
        </div>
      </section>

      {/* 2. Default Post-Auth Landing (Part VI §4.1) */}
      <section aria-labelledby="landing-heading" className="border-t border-line pt-6 space-y-4">
        <div>
          <h2 id="landing-heading" className="font-serif text-xl font-bold text-ink">
            Default Landing Destination
          </h2>
          <p className="mt-1 text-sm text-ink-secondary">
            Choose where ResearchWithME opens after sign-in when no deep link is requested.
          </p>
        </div>
        <div className="grid gap-2 sm:grid-cols-2">
          {LANDING_OPTIONS.map((opt) => (
            <button
              key={opt.value}
              type="button"
              onClick={() => handleSaveLanding(opt.value)}
              disabled={busy}
              aria-pressed={landing === opt.value}
              className={`rounded-xl border p-3 text-left transition-colors ${
                landing === opt.value
                  ? 'border-brand bg-brand/5'
                  : 'border-line bg-surface hover:border-brand/60'
              }`}
            >
              <div className="flex items-center justify-between gap-2">
                <span className="text-sm font-semibold text-ink">{opt.label}</span>
                {landing === opt.value && (
                  <CheckCircle2 className="h-4 w-4 text-brand shrink-0" aria-hidden="true" />
                )}
              </div>
              <p className="mt-1 text-xs text-ink-secondary">{opt.description}</p>
            </button>
          ))}
        </div>
      </section>

      {/* 3. Registered Devices & Offline Security (Part V §15.3) */}
      <section aria-labelledby="devices-heading" className="border-t border-line pt-6 space-y-4">
        <div>
          <h2 id="devices-heading" className="font-serif text-xl font-bold text-ink">
            Devices &amp; Offline Retention
          </h2>
          <p className="mt-1 text-sm text-ink-secondary">
            Restricted research content is never cached by the Service Worker. Revoke lost devices
            or wipe local IndexedDB drafts at any time.
          </p>
        </div>

        <form onSubmit={handleRegisterDevice} className="flex flex-wrap gap-2">
          <label className="sr-only" htmlFor="settings-device-label">
            Device label
          </label>
          <input
            id="settings-device-label"
            type="text"
            value={deviceLabel}
            onChange={(e) => setDeviceLabel(e.target.value)}
            placeholder="Label this device (e.g. Lab Workstation)"
            className="h-11 w-full min-w-0 flex-1 sm:w-auto sm:min-w-[200px] rounded-lg border border-line bg-surface px-3 text-sm text-ink"
          />
          <button
            type="submit"
            disabled={busy || !deviceLabel.trim()}
            className="inline-flex min-h-11 items-center gap-1.5 rounded-lg border border-line bg-surface px-4 py-2 text-xs font-semibold text-ink hover:border-brand disabled:opacity-50"
          >
            <Laptop className="h-4 w-4" aria-hidden="true" />
            Register Device
          </button>
        </form>

        {devices.length > 0 && (
          <ul className="space-y-2">
            {devices.map((dev) => (
              <li
                key={dev.id}
                className="flex items-center justify-between gap-3 rounded-lg border border-line bg-surface px-4 py-3 text-sm"
              >
                <div>
                  <p className="font-medium text-ink">{dev.label}</p>
                  <p className="font-mono text-xs text-ink-secondary">{dev.platform}</p>
                </div>
                <button
                  type="button"
                  onClick={() => handleRevokeDevice(dev.id)}
                  disabled={busy}
                  className="inline-flex min-h-11 items-center gap-1 rounded-lg border border-line bg-canvas px-3.5 py-2 text-xs font-medium text-destructive hover:border-destructive"
                >
                  <Trash2 className="h-3.5 w-3.5" aria-hidden="true" />
                  Revoke
                </button>
              </li>
            ))}
          </ul>
        )}

        <div className="flex flex-wrap gap-3 pt-2">
          <a
            href="/api/me/export"
            download="researchwithme-account-export.json"
            className="inline-flex min-h-11 items-center gap-2 rounded-lg border border-line bg-surface px-4 py-2 text-sm font-medium text-ink hover:border-brand"
          >
            <Download className="h-4 w-4" aria-hidden="true" />
            Download Portable Account Export (SHA-256)
          </a>
          <button
            type="button"
            onClick={handleLocalWipe}
            disabled={busy}
            className="inline-flex min-h-11 items-center gap-2 rounded-lg border border-line bg-surface px-4 py-2 text-sm font-medium text-ink hover:border-brand disabled:opacity-50"
          >
            Clear Local Offline Drafts &amp; Caches
          </button>
        </div>
      </section>

      {/* 4. Privacy-Preserving Account Tombstone (Part V §6.1 & §17) */}
      <section aria-labelledby="tombstone-heading" className="border-t border-line pt-6 space-y-3">
        <div className="flex items-center gap-2 text-destructive">
          <ShieldAlert className="h-5 w-5" aria-hidden="true" />
          <h2 id="tombstone-heading" className="font-serif text-xl font-bold">
            Account Deletion (Citation Tombstone Policy)
          </h2>
        </div>
        <p className="text-sm text-ink-secondary">
          Deleting your account revokes all devices and push subscriptions while retaining minimal
          tombstone markers where published scholarly citations must remain intact. Type{' '}
          <code className="font-mono text-xs text-ink">DELETE MY ACCOUNT</code> to confirm.
        </p>
        <form onSubmit={handleTombstoneAccount} className="flex flex-wrap gap-2">
          <label className="sr-only" htmlFor="settings-tombstone-confirm">
            Confirmation phrase
          </label>
          <input
            id="settings-tombstone-confirm"
            type="text"
            value={tombstonePhrase}
            onChange={(e) => setTombstonePhrase(e.target.value)}
            placeholder="DELETE MY ACCOUNT"
            className="h-11 w-full min-w-0 flex-1 sm:w-auto sm:min-w-[200px] rounded-lg border border-line bg-surface px-3 font-mono text-sm text-ink"
          />
          <button
            type="submit"
            disabled={busy || tombstonePhrase.trim() !== 'DELETE MY ACCOUNT'}
            className="inline-flex min-h-11 items-center rounded-lg border border-destructive bg-destructive/10 px-4 py-2 text-xs font-semibold text-destructive hover:bg-destructive/15 disabled:opacity-40"
          >
            Request Account Tombstone
          </button>
        </form>
      </section>
    </div>
  );
}
