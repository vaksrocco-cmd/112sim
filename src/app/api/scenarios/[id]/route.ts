// Integraatori fail. Avalik stsenaarium (ilma tõeta).
import { NextResponse } from 'next/server';
import { getPublicScenario } from '@/lib/scenarios';

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const s = getPublicScenario(id);
  if (!s) return NextResponse.json({ error: 'not_found' }, { status: 404 });
  return NextResponse.json(s);
}
