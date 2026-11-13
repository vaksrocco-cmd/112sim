// Integraatori fail. Näitab, millised API-d on seadistatud (ainult jah/ei ja mudelite nimed, mitte võtmeid).
import { NextResponse } from 'next/server';
import { supabaseConfigured } from '@/lib/db/supabase';
import { llmStatus } from '@/lib/llm';

export const dynamic = 'force-dynamic';

export function GET() {
  return NextResponse.json({
    ...llmStatus(),
    tts: process.env.TTS_PROVIDER || 'tartunlp',
    supabase: supabaseConfigured(),
    voiceProvider: process.env.NEXT_PUBLIC_VOICE_PROVIDER ?? 'mock',
  });
}
