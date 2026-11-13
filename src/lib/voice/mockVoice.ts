// Integraatori fail (karkass). Mängib fixture'i õigete ajastustega ette, ilma mikrofoni ja API-ta.
import type { TranscriptFixture } from '../types';
import type { VoiceEvents, VoiceProvider, VoiceStartOptions } from './VoiceProvider';

export interface MockVoiceOptions {
  fixture: TranscriptFixture;
  /** Kiirendus: 1 = päris aeg, 4 = neli korda kiirem. */
  speed?: number;
}

export function createMockVoice({ fixture, speed = 1 }: MockVoiceOptions): VoiceProvider {
  const timers: ReturnType<typeof setTimeout>[] = [];
  let stopped = false;

  const at = (ms: number, fn: () => void) => {
    timers.push(setTimeout(() => !stopped && fn(), ms / speed));
  };

  return {
    async start(_opts: VoiceStartOptions, ev: VoiceEvents) {
      stopped = false;
      fixture.segments.forEach((s, i) => {
        at(s.startMs, () => ev.onPartial?.(s.speaker, s.text));
        at(s.endMs, () => ev.onSegment({ ...s, id: `${fixture.id}-${i}` }));
      });
      for (const call of fixture.toolCalls) {
        at(call.atMs, () =>
          ev.onToolCall(call.name === 'end_call' ? { name: 'end_call' } : { name: call.name, args: call.args }),
        );
      }
    },
    sendCue() {
      // Fixture'is on lõpp juba ette kirjutatud.
    },
    async stop() {
      stopped = true;
      timers.forEach(clearTimeout);
      timers.length = 0;
    },
  };
}
