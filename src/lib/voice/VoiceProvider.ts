// LEPING (integraatori fail). KNOWLEDGE.md 9.1. Hääle omanik (Sander) implementeerib selle.
import type { CallMs, Speaker, TranscriptSegment } from '../types';

export type DispatcherToolCall =
  | { name: 'dispatch_ambulance'; args: { priority: 'A' | 'B' | 'C'; address: string; summary: string } }
  | { name: 'end_call' };

export interface VoiceEvents {
  /** Lõplik lause (nii helistaja kui päästekorraldaja). */
  onSegment(seg: TranscriptSegment): void;
  /** Jooksev tekst UI jaoks. */
  onPartial?(speaker: Speaker, text: string): void;
  onToolCall(call: DispatcherToolCall): void;
  /** 0..1, helinivoo animatsiooniks. */
  onLevel?(speaker: Speaker, level: number): void;
  onError(err: Error): void;
}

export interface VoiceStartOptions {
  scenarioId: string;
  /** Kõne algusest möödunud millisekundid. */
  now: () => CallMs;
}

export interface VoiceProvider {
  start(opts: VoiceStartOptions, ev: VoiceEvents): Promise<void>;
  /** Süsteemi märguanne päästekorraldajale (nt „kiirabi on kohal“). Käivitab uue vastuse. */
  sendCue(text: string): void;
  /** Tekstirežiim: helistaja trükitud lause (varuplaan laval). Valikuline. */
  sendCallerText?(text: string): void;
  stop(): Promise<void>;
}

export type VoiceProviderKind = 'mock' | 'openai' | 'cascade' | 'elevenlabs';
