// Teeb päästekorraldaja kindlad laused ette heliks (ElevenLabs), et need mängiksid kõnes viivituseta.
// Käivita:  ELEVENLABS_API_KEY=... node --experimental-strip-types scripts/make-dispatcher-audio.mjs
// Väljund:  public/audio/dispatcher/<räsi>.mp3 ja src/lib/voice/lines.json (lause -> fail). Olemasolevaid faile uuesti ei tehta.
import { createHash } from 'node:crypto';
import fs from 'node:fs';
import { fixedLines } from '../src/lib/dispatcher/policy.ts';

const key = process.env.ELEVENLABS_API_KEY;
const voice = process.env.ELEVENLABS_VOICE_ID || 'fOoS0teaHqaPFXgkrJVL';
const model = process.env.ELEVENLABS_TTS_MODEL || 'eleven_v4_turbo';
if (!key) throw new Error('ELEVENLABS_API_KEY puudub');

const whitelist = fs.readdirSync('src/lib/scenarios').filter((f) => f.endsWith('.json')).flatMap((f) => JSON.parse(fs.readFileSync(`src/lib/scenarios/${f}`, 'utf8')).dispatcherWhitelist ?? []);
const lines = fixedLines(whitelist);
const manifest = {};
let made = 0;
let chars = 0;
for (const text of lines) {
  const name = createHash('sha1').update(`${voice}|${model}|${text}`).digest('hex').slice(0, 12) + '.mp3';
  const file = `public/audio/dispatcher/${name}`;
  manifest[text] = `/audio/dispatcher/${name}`;
  if (fs.existsSync(file)) continue;
  const res = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${voice}?output_format=mp3_44100_64`, {
    method: 'POST',
    headers: { 'xi-api-key': key, 'content-type': 'application/json' },
    body: JSON.stringify({ text, model_id: model, language_code: 'et', voice_settings: { speed: 1, stability: 0.6 } }),
  });
  if (!res.ok) throw new Error(`${res.status} ${(await res.text()).slice(0, 200)} :: ${text}`);
  fs.writeFileSync(file, Buffer.from(await res.arrayBuffer()));
  made++;
  chars += text.length;
}
fs.writeFileSync('src/lib/voice/lines.json', JSON.stringify(manifest, null, 2) + '\n');
console.log(`${lines.length} lauset, ${made} uut faili, ${chars} märki`);
