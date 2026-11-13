// RAPORT (Aaron, feat/stage). Andmed laeb server; vaade on components/report/ReportView.tsx.
import Link from 'next/link';
import { ReportView } from '@/components/report/ReportView';
import { Card, Stack, Text } from '@/components/ui';
import { getSession } from '@/lib/db/sessions';

export const dynamic = 'force-dynamic';

export default async function ReportPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const session = await getSession(id);
  if (!session?.analysis) {
    return (
      <Card>
        <Stack gap={3}>
          <Text>{session ? 'Analüüs on veel pooleli. Värskenda lehte mõne sekundi pärast.' : 'Raportit ei leitud.'}</Text>
          <Link className="text-muted underline" href="/">
            Avalehele
          </Link>
        </Stack>
      </Card>
    );
  }
  return <ReportView session={session} report={session.analysis} />;
}
