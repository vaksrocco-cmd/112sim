// Integraatori fail. Tõde (truth) ei tohi kunagi brauserisse jõuda:
// importige getScenario ainult serveri koodis (API marsruudid, serverikomponendid).
import type { PublicScenario, Scenario } from '../types';
import vanaema from './vanaema-insult.json';

const SCENARIOS: Record<string, Scenario> = {
  'vanaema-insult': vanaema as Scenario,
};

export function listScenarioIds(): string[] {
  return Object.keys(SCENARIOS);
}

/** AINULT serveris. Sisaldab tõde. */
export function getScenario(id: string): Scenario | undefined {
  return SCENARIOS[id];
}

/** Ohutu brauserile: ilma tõeta. */
export function getPublicScenario(id: string): PublicScenario | undefined {
  const s = SCENARIOS[id];
  if (!s) return undefined;
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const { truth, ...pub } = s;
  return pub;
}
