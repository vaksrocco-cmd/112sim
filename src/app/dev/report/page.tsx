// Aaroni arendusleht: raport fixture'iga, ilma kõneta.
import sample from '@fixtures/report/sample-session.json';
import { ReportView } from '@/components/report/ReportView';
import type { CallSession } from '@/lib/types';

export default function DevReport() {
  const session = sample as unknown as CallSession;
  return <ReportView session={session} report={session.analysis!} />;
}
