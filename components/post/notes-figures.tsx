import FlowDiagram from '@/components/library/FlowDiagram';
import PathwayMap from '@/components/library/PathwayMap';
import AssumptionSwitches from '@/components/library/AssumptionSwitches';
import SelfCheckQuiz from '@/components/library/SelfCheckQuiz';
import { NOTES_NOTE_FLOW_NODES } from '@/lib/post/notes-from-a-year-of-public-reading';
import { NOTES_NOTE_FLOW_EDGES } from '@/lib/post/notes-from-a-year-of-public-reading';
import { NOTES_NOTE_FLOW_PATH } from '@/lib/post/notes-from-a-year-of-public-reading';
import { NOTES_PRACTICE_STAGES } from '@/lib/post/notes-from-a-year-of-public-reading';
import { NOTES_COST_ASSUMPTIONS } from '@/lib/post/notes-from-a-year-of-public-reading';
import { NOTES_COST_OUTCOMES } from '@/lib/post/notes-from-a-year-of-public-reading';
import { NOTES_QUIZ } from '@/lib/post/notes-from-a-year-of-public-reading';

/**
 * Thin bindings for the public-reading notes post: post data, library interaction.
 */

export function NotesPipelineFlow() {
  return (
    <FlowDiagram title="How a note travels when it has a reader" subtitle="Walk the trace; the fork at the one-paragraph test decides post versus shelved draft." nodes={NOTES_NOTE_FLOW_NODES} edges={NOTES_NOTE_FLOW_EDGES} path={NOTES_NOTE_FLOW_PATH} />
  );
}

export function NotesPracticePathway() {
  return (
    <PathwayMap title="The practice, concretely" subtitle="Pick honestly at each fork — the shortcuts accumulate as drafts abandoned." stages={NOTES_PRACTICE_STAGES} costUnit="drafts abandoned" />
  );
}

export function NotesCostSwitches() {
  return (
    <AssumptionSwitches assumptions={NOTES_COST_ASSUMPTIONS} outcomes={NOTES_COST_OUTCOMES} />
  );
}

export function NotesQuiz() {
  return (
    <SelfCheckQuiz title="Check the practice reading" questions={NOTES_QUIZ} />
  );
}
