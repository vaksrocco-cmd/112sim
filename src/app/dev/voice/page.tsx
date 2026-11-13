'use client';
// Sanderi arendusleht: häälepakkuja eraldi, ilma režissööri ja analüüsita. ?voice=mock | cascade
import { useRef, useState } from 'react';
import goodCall from '@fixtures/transcripts/good_call.json';
import { LiveTranscript } from '@/components/sim/LiveTranscript';
import { Button, Stack, Text } from '@/components/ui';
import type { Speaker, TranscriptFixture, TranscriptSegment } from '@/lib/types';
import { createVoiceProvider, resolveVoiceKind, type VoiceProvider } from '@/lib/voice';

export default function DevVoice() {
  const [segs, setSegs] = useState<TranscriptSegment[]>([]);
  const [partial, setPartial] = useState<{ speaker: Speaker; text: string } | null>(null);
  const [log, setLog] = useState<string[]>([]);
  const voice = useRef<VoiceProvider | null>(null);

  async function start() {
    setSegs([]);
    setLog([]);
    const t0 = performance.now();
    const kind = resolveVoiceKind(window.location.search);
    const v = createVoiceProvider(kind, { fixture: goodCall as unknown as TranscriptFixture, speed: 4 });
    voice.current = v;
    try {
      await v.start(
        { scenarioId: 'vanaema-insult', now: () => Math.round(performance.now() - t0) },
        {
          onSegment: (s) => {
            setSegs((p) => [...p, s]);
            setPartial(null);
          },
          onPartial: (speaker, text) => setPartial({ speaker, text }),
          onToolCall: (c) => setLog((l) => [...l, JSON.stringify(c)]),
          onError: (e) => setLog((l) => [...l, `VIGA: ${e.message}`]),
        },
      );
      setLog((l) => [...l, `käivitus: ${kind}`]);
    } catch (e) {
      setLog((l) => [...l, `VIGA: ${e instanceof Error ? e.message : String(e)}`]);
    }
  }

  return (
    <Stack gap={4}>
      <Stack direction="row" gap={2}>
        <Button onClick={start}>Start</Button>
        <Button variant="secondary" onClick={() => voice.current?.stop()}>
          Stop
        </Button>
        <Button variant="ghost" onClick={() => voice.current?.sendCue('[SÜSTEEM] Kiirabi on kohal.')}>
          Saada märguanne
        </Button>
      </Stack>
      <LiveTranscript segments={segs} partial={partial} />
      {log.map((l, i) => (
        <Text key={i} size="sm" mono tone="muted">
          {l}
        </Text>
      ))}
    </Stack>
  );
}
