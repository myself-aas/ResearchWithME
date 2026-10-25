import { NextResponse } from 'next/server';
import { requireEditor } from '@/lib/cms/auth';
import { errorResponse, noStoreHeaders } from '@/lib/cms/http';
import { getEditorCmsStore } from '@/lib/cms/store';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET() {
  const gate = await requireEditor();
  if (!gate.ok) {
    return NextResponse.json({ error: gate.error }, { status: gate.status });
  }

  try {
    const store = await getEditorCmsStore();
    const comments = await store.listComments();
    return NextResponse.json({ comments, mode: gate.mode }, { headers: noStoreHeaders() });
  } catch (error) {
    return errorResponse(error);
  }
}
