import { NextRequest, NextResponse } from 'next/server';
import { postArticleToLinkedIn } from '@/lib/linkedin/automation';
import { headers } from 'next/headers';

export async function POST(request: NextRequest) {
  // Verify webhook signature if using Supabase webhooks
  const headersList = await headers();
  const _signature = headersList.get('x-supabase-signature');
  
  // TODO: Verify signature with Supabase webhook secret
  
  const payload = await request.json();
  
  // Supabase webhook payload for INSERT on articles table
  if (payload.type === 'INSERT' && payload.table === 'articles') {
    const article = payload.record;
    
    // Only post if article is published (not draft)
    if (article.status === 'published' && article.slug) {
      // Fire and forget - don't block webhook response
      postArticleToLinkedIn(article.slug).catch(err => {
        console.error(`[LinkedIn] Failed to post article ${article.slug}:`, err);
      });
    }
  }

  return NextResponse.json({ received: true });
}