// HÄÄL (Sander, feat/voice). KNOWLEDGE.md 9.1. VARUPAKKUJA, kui OpenAI Realtime ei sobi.
// Kaskaad: brauseri kõnetuvastus (et-EE) -> /api/voice/turn (tekstimudel, voog) -> /api/voice/tts -> kõlar.
import type { VoiceProvider } from './VoiceProvider';

export function createCascadeVoice(): VoiceProvider {
  // TODO(Sander): KNOWLEDGE.md 9.1 "Valmis, kui".
  const notReady = () => {
    throw new Error('Kaskaadhääl ei ole veel valmis. Kasuta ?voice=mock');
  };
  return {
    async start() {
      notReady();
    },
    sendCue() {},
    async stop() {},
  };
}
