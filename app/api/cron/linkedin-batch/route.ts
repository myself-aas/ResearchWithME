import { NextResponse } from 'next/server';
import { checkAndPostNewArticles } from '@/lib/linkedin/automation';
import { headers } from 'next/headers';

// This route should be called by a cron job (e.g., Vercel Cron, GitHub Actions, or external scheduler)
// Protect with CRON_SECRET
export async function GET(_request: Request) {
  const headersList = await headers();
  const authHeader = headersList.get('authorization');
  const cronSecret = process.env.CRON_SECRET;

  if (!cronSecret || authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const result = await checkAndPostNewArticles();
    return NextResponse.json({ success: true, ...result });
  } catch (error) {
    console.error('[LinkedIn Cron] Batch posting failed:', error);
    return NextResponse.json({ 
      success: false, 
      error: error instanceof Error ? error.message : 'Unknown error' 
    }, { status: 500 });
  }
}