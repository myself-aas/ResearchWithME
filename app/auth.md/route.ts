import { authMdResponse } from '@/lib/auth-md';

export function GET() {
  return authMdResponse('GET');
}

export function HEAD() {
  return authMdResponse('HEAD');
}
