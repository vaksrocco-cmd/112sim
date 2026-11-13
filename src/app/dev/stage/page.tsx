// Aaroni arendusleht: video seisundid nupuvajutusega, ilma kõneta.
import { notFound } from 'next/navigation';
import { getPublicScenario } from '@/lib/scenarios';
import { StagePlayground } from './StagePlayground';

export default function DevStage() {
  const s = getPublicScenario('vanaema-insult');
  if (!s) notFound();
  return <StagePlayground scenario={s} />;
}
