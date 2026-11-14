// RAPORT (Aaron, feat/stage). Andmed laeb server; vaade on components/report/ReportView.tsx.
import Link from 'next/link';
import { ReportView } from '@/components/report/ReportView';
import { Heading, Page, Stack, Text, buttonClass } from '@/components/ui';
import { getSession } from '@/lib/db/sessions';

export const dynamic = 'force-dynamic';

export default async function ReportPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const session = await getSession(id);
  if (!session?.analysis) {
    return (
      <Page>
        <div className="flex flex-1 flex-col justify-center gap-6">
          <Stack gap={2}>
            <Heading level={2}>{session ? 'Analüüs on veel pooleli' : 'Raportit ei leitud'}</Heading>
            <Text tone="muted">{session ? 'Värskenda lehte mõne sekundi pärast.' : 'Link võib olla vigane või kõne jäi salvestamata.'}</Text>
          </Stack>
          <Stack gap={3}>
            {session ? (
              <a className={buttonClass({ size: 'xl', block: true })} href={`/report/${id}`}>
                Värskenda
              </a>
            ) : null}
            <Link className={buttonClass({ variant: session ? 'secondary' : 'primary', size: session ? 'lg' : 'xl', block: true })} href="/">
              Avalehele
            </Link>
          </Stack>
        </div>
      </Page>
    );
  }
  return <ReportView session={session} report={session.analysis} />;
}
