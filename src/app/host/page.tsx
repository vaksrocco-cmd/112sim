// Suur ekraan (projektor). Avab toa, näitab QR-koodi ja mängib videot telefonikõnega sünkroonis.
import { notFound } from 'next/navigation';
import { getPublicScenario } from '@/lib/scenarios';
import { HostView } from './HostView';

export default function HostPage() {
  const scenario = getPublicScenario('vanaema-insult');
  if (!scenario) notFound();
  return <HostView scenario={scenario} />;
}
