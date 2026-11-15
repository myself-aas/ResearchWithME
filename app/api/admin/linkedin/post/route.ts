import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { postArticleToLinkedIn } from '@/lib/linkedin/automation';

export async function POST(request: NextRequest) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single();
  if (profile?.role !== 'admin') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const { slug } = await request.json();
  
  if (!slug || typeof slug !== 'string') {
    return NextResponse.json({ error: 'Missing or invalid slug' }, { status: 400 });
  }

  const result = await postArticleToLinkedIn(slug);
  
  if (result.success) {
    return NextResponse.json({ success: true, postUrn: result.postUrn });
  } else {
    return NextResponse.json({ success: false, error: result.error }, { status: 500 });
  }
}