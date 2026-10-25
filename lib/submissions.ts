import fs from 'node:fs';
import path from 'node:path';
import { cleanText, isInstitutionalEmail, isValidEmail, safeExternalUrl } from './validation';

export interface SubmissionRecord {
  id: string;
  title: string;
  authorName: string;
  email: string;
  category: string;
  abstract: string;
  artifact: string;
  dataUrl: string | null;
  institutional: boolean;
  createdAt: string;
  status: 'received';
}

const DATA_DIR = path.join(process.cwd(), 'data');
const SUBMISSIONS_FILE = path.join(DATA_DIR, 'submissions.json');
const MAX_SUBMISSIONS = 500;

function read(): SubmissionRecord[] {
  try {
    if (!fs.existsSync(SUBMISSIONS_FILE)) return [];
    const parsed: unknown = JSON.parse(fs.readFileSync(SUBMISSIONS_FILE, 'utf8'));
    return Array.isArray(parsed) ? (parsed as SubmissionRecord[]) : [];
  } catch {
    return [];
  }
}

export type SubmissionInput = {
  title?: unknown;
  authorName?: unknown;
  email?: unknown;
  category?: unknown;
  abstract?: unknown;
  artifact?: unknown;
  dataUrl?: unknown;
  consent?: unknown;
};

export type SubmissionResult =
  | { ok: true; submission: SubmissionRecord }
  | { ok: false; status: number; error: string };

export function createSubmission(input: SubmissionInput): SubmissionResult {
  const title = cleanText(input.title, 180);
  const authorName = cleanText(input.authorName, 120);
  const email = cleanText(input.email, 254).toLowerCase();
  const category = cleanText(input.category, 80) || 'Research Reviews';
  const abstract = cleanText(input.abstract, 4000);
  const artifact = cleanText(input.artifact, 240);
  const rawDataUrl = cleanText(input.dataUrl, 2048);
  const consent = input.consent === true || input.consent === 'true';

  if (title.length < 8) return { ok: false, status: 400, error: 'Add a manuscript title of at least 8 characters.' };
  if (authorName.length < 2) return { ok: false, status: 400, error: 'Add the name that should appear on the submission.' };
  if (!isValidEmail(email)) return { ok: false, status: 400, error: 'Enter a complete contact email, including an @ and a domain.' };
  if (abstract.length < 80) {
    return { ok: false, status: 400, error: 'The abstract needs at least 80 characters so editors can assess the scope.' };
  }
  if (rawDataUrl && !safeExternalUrl(rawDataUrl)) {
    return { ok: false, status: 400, error: 'The data or code link must start with http:// or https://.' };
  }
  if (!consent) {
    return { ok: false, status: 400, error: 'Confirm the citation and conflict-of-interest statement before submitting.' };
  }

  const record: SubmissionRecord = {
    id: `RWM-${new Date().getFullYear()}-${Math.random().toString(36).slice(2, 8).toUpperCase()}`,
    title,
    authorName,
    email,
    category,
    abstract,
    artifact,
    dataUrl: rawDataUrl ? safeExternalUrl(rawDataUrl) : null,
    institutional: isInstitutionalEmail(email),
    createdAt: new Date().toISOString(),
    status: 'received',
  };

  try {
    const existing = read();
    const next = [record, ...existing].slice(0, MAX_SUBMISSIONS);
    fs.mkdirSync(DATA_DIR, { recursive: true });
    const temporary = `${SUBMISSIONS_FILE}.${process.pid}.tmp`;
    fs.writeFileSync(temporary, JSON.stringify(next, null, 2), 'utf8');
    fs.renameSync(temporary, SUBMISSIONS_FILE);
  } catch {
    return {
      ok: false,
      status: 503,
      error: 'Submissions are temporarily unavailable because the archive is read-only. Email the editorial desk instead.',
    };
  }

  return { ok: true, submission: record };
}
