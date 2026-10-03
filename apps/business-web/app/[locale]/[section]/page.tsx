import { OperationsPage } from '@/components/operations-page';
import { BusinessMessagesPage } from '@/components/messages-page';

export default function SectionPage({ params }: { params: { section: string } }) {
  if (params.section === 'messages') return <BusinessMessagesPage />;
  return <OperationsPage section={params.section} />;
}
