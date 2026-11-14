// LEPINGUD. Seda faili muudab ainult integraator (KNOWLEDGE.md peatükk 8).
// Kõik moodulid impordivad tüübid siit.

/** Millisekundid kõne algusest (klikk „Helista 112“ = 0). */
export type CallMs = number;
export type TriState = 'yes' | 'no' | 'unknown';
export type Speaker = 'caller' | 'dispatcher';

// ───────── Stsenaarium ─────────
export interface SymptomDef { id: string; label: string; hints: string[] }

export interface ScenarioState {
  id: string;                                   // 'INTRO' | 'S1' | ... | 'END_GOOD'
  kind: 'intro' | 'loop' | 'ending';
  clipUrl?: string;
  /** Üleminekuklipp, mis mängib ÜKS kord, kui sellesse seisundisse jõutakse; seejärel algab `clipUrl` kordus. */
  onsetClipUrl?: string;
  posterUrl?: string;
  caption: string;
  observable: string[];                         // SymptomDef.id-d, mida selles seisundis näha on
  vitals: { conscious: 'yes' | 'no'; breathing: 'yes' | 'no' };
  requiresReport: boolean;                      // kas sellesse seisundisse jõudmisest peab teatama
  reportWindowMs?: number;                      // kohustuslik, kui requiresReport = true
}

export type Condition =
  | { type: 'call_elapsed'; ms: CallMs }               // kõne algusest on möödas ≥ ms
  | { type: 'change_unreported' }                      // from-seisundi reportWindowMs möödas ja teadet pole
  | { type: 'location_incomplete_after'; ms: CallMs }; // ms möödas ja asukoht pole 'complete'

export interface Transition { from: string; to: string; when: Condition[]; reason: string } // when = VÕI

export interface ScenarioRules {
  addressDeadlineMs: CallMs;
  arrivalAfterDispatchMs: number;   // varaseim lõpp pärast abi saatmist
  wrapUpGraceMs: number;            // kui päästekorraldaja ei lõpeta ise, lõpetame selle aja järel
  maxCallMs: CallMs;
  wrapUpCue: string;
}

export interface ScenarioTruth {
  patient: { name: string; age: number; sex: 'female' | 'male'; relation: string };
  address: { street: string; house: string; apartment?: string; settlement: string; municipality: string };
  condition: string;
  onsetNote?: string;
}

export interface Scenario {
  id: string; version: number; title: string; locale: 'et-EE';
  brief: { headline: string; known: string[]; envelope?: string[] };
  truth: ScenarioTruth;                         // AINULT serveris
  symptoms: SymptomDef[];
  states: ScenarioState[];
  transitions: Transition[];
  rules: ScenarioRules;
  dispatcherWhitelist: string[];
}
export type PublicScenario = Omit<Scenario, 'truth'>;

// ───────── Transkript ─────────
export interface TranscriptSegment {
  id: string; speaker: Speaker; text: string; startMs: CallMs; endMs: CallMs;
}

// ───────── Kohtuniku väljund ─────────
export interface CallFacts {
  incident: { said: boolean; atMs?: CallMs; quote?: string; volunteered?: boolean };
  location: {
    street?: string; house?: string; apartment?: string; settlement?: string; municipality?: string;
    level: 'none' | 'partial' | 'complete';     // complete = tänav + maja + (asula VÕI vald) vastab tõele
    partialAtMs?: CallMs; completeAtMs?: CallMs;
    wrongParts: ('street' | 'house' | 'settlement')[];
    volunteered?: boolean;                      // öeldi enne, kui päästekorraldaja küsis
  };
  patient: { ageSaid: boolean; conscious: TriState; breathing: TriState };
  symptomsReported: { symptom: string; atMs: CallMs; quote: string }[];
  changeReports: { stateId: string; atMs: CallMs; quote: string }[];
  dialogue: { questionsAsked: number; questionsAnswered: number; contradictions: number; offTopicTurns: number };
}

// ───────── Sündmused ─────────
export type CallEndReason = 'dispatcher_ended' | 'caller_hangup' | 'timeout' | 'error';

export type CallEvent =
  | { type: 'call_started'; atMs: 0 }
  | { type: 'state_changed'; atMs: CallMs; from: string; to: string; reason: string }
  | { type: 'ambulance_dispatched'; atMs: CallMs; priority: 'A' | 'B' | 'C'; address: string; summary: string }
  | { type: 'wrap_up_requested'; atMs: CallMs }
  | { type: 'call_ended'; atMs: CallMs; reason: CallEndReason };

export interface StateVisit { stateId: string; enteredAtMs: CallMs }

// ───────── Režissöör ─────────
export type Outcome = 'good' | 'delayed' | 'bad';

export interface DirectorInput {
  nowMs: CallMs;
  scenario: PublicScenario;
  stateId: string;
  stateEnteredAtMs: CallMs;
  facts: CallFacts;
  events: CallEvent[];
}

export type DirectorAction =
  | { type: 'transition'; to: string; reason: string }
  | { type: 'wrap_up'; cue: string }
  | { type: 'finish'; outcome: Outcome; endingText: string };

// ───────── Analüüs ─────────
export type RubricId = 'incident' | 'location' | 'patient' | 'change' | 'answers' | 'clarity' | 'ending';

export interface RubricItemResult {
  id: RubricId; label: string; maxPoints: number; points: number;
  why: string;                                  // koodi genereeritud lühipõhjendus
  evidence?: string;                            // tsitaat transkriptist (LLM leiab, kood kontrollib, et see on transkriptis olemas)
  atMs?: CallMs;
  notApplicable?: boolean;
}

/** Tagasiside ideaalse kõne järjekorras: kus -> mis juhtus -> kellega -> seisund -> millal -> muutus. */
export type FeedbackStepId = 'where' | 'what' | 'who' | 'condition' | 'when' | 'change';
/** said = ütles ise; prompted = alles küsimise peale; partial = poolikult; missing = jäi ütlemata. Oleku määrab kood. */
export type FeedbackStatus = 'said' | 'prompted' | 'partial' | 'missing';
export interface FeedbackStep {
  id: FeedbackStepId; label: string; status: FeedbackStatus;
  atMs?: CallMs;
  quote?: string;                               // helistaja sõnad; kood kontrollib, et need on transkriptis olemas
  note: string;                                 // üks lause tagasisidet
  example: string;                              // näidislause, kuidas seda öelda
}

export interface AnalysisReport {
  sessionId: string;
  score: number;                                // 0–100; read, mida ei saanud hinnata (notApplicable), jäävad arvestusest välja
  outcome: Outcome;
  times: { incidentMs?: CallMs; locationMs?: CallMs; changeReactionMs?: number; durationMs: CallMs };
  rubric: RubricItemResult[];
  missed: string[];                             // kuni 4 lühikest lauset
  tips: [string, string, string];
  whatWouldHaveHappened: string;
  summary?: string;                             // AI kokkuvõte kõnest, 1–2 lauset
  steps?: FeedbackStep[];                       // puudub vanadel raportitel
}

// ───────── Sessioon ─────────
export interface CallSession {
  id: string; scenarioId: string; scenarioVersion: number; createdAt: string;
  clientId?: string; groupCode?: string;        // anonüümne seadme id; klassi kood (õpetaja vaade, P2)
  durationMs: CallMs;
  transcript: TranscriptSegment[];
  events: CallEvent[];
  stateHistory: StateVisit[];
  finalFacts: CallFacts;
  analysis?: AnalysisReport;
}

// ───────── Fixture'id (mockVoice ja testid) ─────────
export type FixtureToolCall =
  | { name: 'dispatch_ambulance'; atMs: CallMs; args: { priority: 'A' | 'B' | 'C'; address: string; summary: string } }
  | { name: 'end_call'; atMs: CallMs };

export interface TranscriptFixture {
  id: string;
  scenarioId: string;
  segments: Omit<TranscriptSegment, 'id'>[];
  toolCalls: FixtureToolCall[];
  expect?: { states?: string[]; outcome?: Outcome; score?: number; facts?: Record<string, unknown> };
}
