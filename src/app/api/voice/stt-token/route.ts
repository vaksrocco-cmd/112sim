// HÄÄL. Ühekordne luba brauserile ElevenLabsi voogtuvastuse (Scribe Realtime) jaoks.
// Päris võti ei lahku serverist: brauser saab 15 minutit kehtiva ühekordse loa.
// Dokumentatsioon: https://elevenlabs.io/docs/api-reference/tokens/create
import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export async function POST() {
  const key = process.env.ELEVENLABS_API_KEY;
  if (!key) return NextResponse.json({ error: 'stt_stream_not_configured' }, { status: 501 });
  try {
    const res = await fetch('https://api.elevenlabs.io/v1/single-use-token/realtime_scribe', {
      method: 'POST',
      headers: { 'xi-api-key': key },
      cache: 'no-store',
    });
    const data = (await res.json().catch(() => null)) as { token?: string } | null;
    if (!res.ok || !data?.token) return NextResponse.json({ error: 'stt_token_failed' }, { status: 502 });
    return NextResponse.json({ token: data.token, model: process.env.ELEVENLABS_STT_LIVE_MODEL || 'scribe_v3_live' });
  } catch {
    return NextResponse.json({ error: 'stt_token_failed' }, { status: 502 });
  }
}
