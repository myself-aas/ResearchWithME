import { skillsIndexResponse } from '@/lib/agent-skills';

export function GET() {
  return skillsIndexResponse('GET');
}

export function HEAD() {
  return skillsIndexResponse('HEAD');
}
