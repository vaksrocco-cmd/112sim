// Serverikomponent: laeb avaliku stsenaariumi (ilma tõeta) ja annab selle kliendile.
import { notFound } from 'next/navigation';
import { SimulationView } from '@/components/sim/SimulationView';
import { getPublicScenario } from '@/lib/scenarios';

export default async function SimPage({ params }: { params: Promise<{ scenarioId: string }> }) {
  const { scenarioId } = await params;
  const scenario = getPublicScenario(scenarioId);
  if (!scenario) notFound();
  return <SimulationView scenario={scenario} />;
}
