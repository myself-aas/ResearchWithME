import { skillArtifactResponse } from '@/lib/agent-skills';

export function GET() {
  return skillArtifactResponse('GET');
}

export function HEAD() {
  return skillArtifactResponse('HEAD');
}
