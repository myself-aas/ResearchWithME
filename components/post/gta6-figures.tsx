import MetricMatrix from '@/components/library/MetricMatrix';
import HotspotAtlas from '@/components/library/HotspotAtlas';
import PathwayMap from '@/components/library/PathwayMap';
import SelfCheckQuiz from '@/components/library/SelfCheckQuiz';
import { GTA6_FILES_COLUMNS } from '@/lib/post/gta6-emulator-review-verify-the-claim';
import { GTA6_FILES_ROWS } from '@/lib/post/gta6-emulator-review-verify-the-claim';
import { GTA6_CLAIM_PINS } from '@/lib/post/gta6-emulator-review-verify-the-claim';
import { GTA6_VERIFY_STAGES } from '@/lib/post/gta6-emulator-review-verify-the-claim';
import { GTA6_QUIZ } from '@/lib/post/gta6-emulator-review-verify-the-claim';

/**
 * Thin bindings for the GTA6 emulator review: post data, library interaction.
 */

export function Gta6FilesMatrix() {
  return <MetricMatrix title="The entire inspected tree" subtitle="Four tracked files with their real sizes — sort to see how little there is." columns={GTA6_FILES_COLUMNS} rows={GTA6_FILES_ROWS} caption="Tracked file" />;
}

export function Gta6ClaimAtlas() {
  return <HotspotAtlas sceneLabel="Anatomy of the emulator claim" points={GTA6_CLAIM_PINS} />;
}

export function Gta6VerifyPathway() {
  return <PathwayMap title="The verification pathway" subtitle="Pin, inspect, compare, decide — your choices accumulate what verification you skipped." stages={GTA6_VERIFY_STAGES} costUnit="unverified steps" />;
}

export function Gta6Quiz() {
  return <SelfCheckQuiz title="Check the evidence reading" questions={GTA6_QUIZ} />;
}
