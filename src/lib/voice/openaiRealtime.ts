// HÄÄL (Sander, feat/voice). KNOWLEDGE.md 9.1. PÕHIPAKKUJA: OpenAI Realtime üle WebRTC.
// Juhend (võta sündmuste ja väljade nimed SIIT, mitte mälust):
//   https://developers.openai.com/api/docs/guides/realtime-webrtc
//
// Voog:
//  1. POST /api/realtime/session { scenarioId } -> { ephemeralKey, model }  (päris võti jääb serverisse)
//  2. new RTCPeerConnection(); lisa mikrofoni rada (getUserMedia); mängi kaugrada <audio> elemendis
//  3. pc.createDataChannel('oai-events'): sündmused mõlemas suunas (transkript, tööriistakutsed, sendCue)
//  4. SDP pakkumine: POST https://api.openai.com/v1/realtime/calls
//     päised: Authorization: Bearer <ephemeralKey>, Content-Type: application/sdp; keha = offer.sdp
//     vastuse tekst on SDP answer -> pc.setRemoteDescription({ type: 'answer', sdp })
//  5. Andmekanali sündmustest tee TranscriptSegment-id (mõlemad kõnelejad) ja DispatcherToolCall-id.
import type { VoiceProvider } from './VoiceProvider';

export function createOpenAiRealtimeVoice(): VoiceProvider {
  // TODO(Sander): KNOWLEDGE.md 9.1 "Valmis, kui".
  const notReady = () => {
    throw new Error('OpenAI Realtime hääl ei ole veel valmis. Kasuta ?voice=mock');
  };
  return {
    async start() {
      notReady();
    },
    sendCue() {},
    async stop() {},
  };
}
