// Serverikomponent: laeb avaliku stsenaariumi (ilma tõeta) ja annab selle kliendile.
// ?room=KOOD seob telefoni suure ekraaniga (/host).
import { notFound } from 'next/navigation';
import { SimulationView } from '@/components/sim/SimulationView';
import { getPublicScenario } from '@/lib/scenarios';

export default async function SimPage({
  params,
  searchParams,
}: {
  params: Promise<{ scenarioId: string }>;
  searchParams: Promise<{ room?: string }>;
}) {
  const { scenarioId } = await params;
  const { room } = await searchParams;
  const scenario = getPublicScenario(scenarioId);
  if (!scenario) notFound();
  return <SimulationView scenario={scenario} room={room && /^[A-Za-z0-9]{4,8}$/.test(room) ? room.toUpperCase() : undefined} />;
}
