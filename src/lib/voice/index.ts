// Integraatori fail. Valib häälepakkuja: URL ?voice=... või NEXT_PUBLIC_VOICE_PROVIDER.
import type { TranscriptFixture } from '../types';
import { createCascadeVoice } from './cascade';
import { createMockVoice } from './mockVoice';
import type { VoiceProvider, VoiceProviderKind } from './VoiceProvider';

export function resolveVoiceKind(search?: string | null): VoiceProviderKind {
  const fromUrl = search ? new URLSearchParams(search).get('voice') : null;
  const v = (fromUrl ?? process.env.NEXT_PUBLIC_VOICE_PROVIDER ?? 'mock') as VoiceProviderKind;
  return ['mock', 'cascade', 'elevenlabs'].includes(v) ? v : 'mock';
}

export function createVoiceProvider(
  kind: VoiceProviderKind,
  opts: { fixture: TranscriptFixture; speed?: number },
): VoiceProvider {
  switch (kind) {
    case 'cascade':
      return createCascadeVoice();
    case 'elevenlabs':
      // TODO(Sander): varupakkuja.
      return createCascadeVoice();
    default:
      return createMockVoice(opts);
  }
}

export type { VoiceProvider, VoiceProviderKind } from './VoiceProvider';
