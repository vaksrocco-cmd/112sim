// Integraatori fail. Sessioonide salvestus: Supabase, kui seadistatud; muidu serveri mälu (demo ei tohi andmebaasi taha jääda).
import type { AnalysisReport, CallSession } from '../types';
import { supabaseConfigured, supabaseRequest } from './supabase';

type Row = {
  id: string;
  created_at: string;
  scenario_id: string;
  scenario_version: number;
  client_id: string | null;
  group_code: string | null;
  duration_ms: number;
  transcript: CallSession['transcript'];
  events: CallSession['events'];
  state_history: CallSession['stateHistory'];
  final_facts: CallSession['finalFacts'];
  analysis: AnalysisReport | null;
  score: number | null;
  outcome: string | null;
};

const g = globalThis as unknown as { __sessions?: Map<string, CallSession> };
const memory = (g.__sessions ??= new Map<string, CallSession>());

function toSession(r: Row): CallSession {
  return {
    id: r.id,
    createdAt: r.created_at,
    scenarioId: r.scenario_id,
    scenarioVersion: r.scenario_version,
    clientId: r.client_id ?? undefined,
    groupCode: r.group_code ?? undefined,
    durationMs: r.duration_ms,
    transcript: r.transcript,
    events: r.events,
    stateHistory: r.state_history,
    finalFacts: r.final_facts,
    analysis: r.analysis ?? undefined,
  };
}

export async function createSession(input: Omit<CallSession, 'id' | 'createdAt'>): Promise<CallSession> {
  if (supabaseConfigured()) {
    try {
      const rows = await supabaseRequest<Row[]>('call_sessions', {
        method: 'POST',
        body: JSON.stringify({
          scenario_id: input.scenarioId,
          scenario_version: input.scenarioVersion,
          client_id: input.clientId ?? null,
          group_code: input.groupCode ?? null,
          duration_ms: Math.round(input.durationMs),
          transcript: input.transcript,
          events: input.events,
          state_history: input.stateHistory,
          final_facts: input.finalFacts,
        }),
      });
      const s = toSession(rows[0]);
      memory.set(s.id, s);
      return s;
    } catch (e) {
      console.error('[sessions] Supabase failed, using memory', e);
    }
  }
  const s: CallSession = { ...input, id: crypto.randomUUID(), createdAt: new Date().toISOString() };
  memory.set(s.id, s);
  return s;
}

export async function getSession(id: string): Promise<CallSession | undefined> {
  const m = memory.get(id);
  if (m) return m;
  if (!supabaseConfigured()) return undefined;
  try {
    const rows = await supabaseRequest<Row[]>(`call_sessions?id=eq.${encodeURIComponent(id)}&select=*`);
    return rows[0] ? toSession(rows[0]) : undefined;
  } catch (e) {
    console.error('[sessions] get failed', e);
    return undefined;
  }
}

export async function saveAnalysis(id: string, analysis: AnalysisReport): Promise<void> {
  const m = memory.get(id);
  if (m) memory.set(id, { ...m, analysis });
  if (!supabaseConfigured()) return;
  try {
    await supabaseRequest<Row[]>(`call_sessions?id=eq.${encodeURIComponent(id)}`, {
      method: 'PATCH',
      body: JSON.stringify({ analysis, score: analysis.score, outcome: analysis.outcome }),
    });
  } catch (e) {
    console.error('[sessions] saveAnalysis failed', e);
  }
}
