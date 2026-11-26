/**
 * Pure logic for the PathwayMap figure (archetype: route-choice-pathway).
 * Stages in sequence; some stages are forks where the reader picks one
 * option. The chosen route lights up on the map and its per-option
 * requirement totals accumulate — a decision path, not a decorated list.
 */

export type PathwayOption = {
  id: string;
  label: string;
  /** One-line fact about what this choice commits you to. */
  detail: string;
  /** Requirement units this choice adds (e.g. services to operate). */
  cost?: number;
}

export type PathwayStage = {
  id: string;
  label: string;
  /** A fork stage offers choices; a plain stage is informational. */
  options?: PathwayOption[];
  note?: string;
}

/** The chosen option per fork stage, defaulting to the first. */
export function initialChoices(stages: PathwayStage[]): Record<string, string> {
  const choices: Record<string, string> = {};
  for (const stage of stages) {
    if (stage.options?.length) choices[stage.id] = stage.options[0].id;
  }
  return choices;
}

export function clampChoice(stage: PathwayStage, optionId: string | undefined): string {
  if (stage.options?.some((option) => option.id === optionId)) return optionId as string;
  return stage.options?.[0]?.id ?? '';
}

/** The selected option objects, stage by stage. */
export function chosenOptions(
  stages: PathwayStage[],
  choices: Record<string, string>,
): Array<{ stage: PathwayStage; option: PathwayOption | null }> {
  return stages.map((stage) => ({
    stage,
    option: stage.options?.find((option) => option.id === choices[stage.id]) ?? null,
  }));
}

/** Sum of the chosen route's costs (stages without costs contribute 0). */
export function routeCost(
  stages: PathwayStage[],
  choices: Record<string, string>,
): number {
  return chosenOptions(stages, choices).reduce(
    (total, { option }) => total + (option?.cost ?? 0),
    0,
  );
}
