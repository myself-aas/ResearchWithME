import { NextResponse } from 'next/server';
import { getSourceWithDetails } from '@/lib/v34/store';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(_request: Request, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params;
  const details = await getSourceWithDetails(id);
  if (!details) {
    return NextResponse.json({ error: 'Source not found.' }, { status: 404 });
  }
  return NextResponse.json(details);
}
