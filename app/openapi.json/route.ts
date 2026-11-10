import { OPENAPI_DOCUMENT } from '@/lib/openapi';

export const dynamic = 'force-dynamic';

export function GET() {
  return Response.json(OPENAPI_DOCUMENT);
}
