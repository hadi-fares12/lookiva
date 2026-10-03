import { OperationsPage } from '@/components/operations-page';
import { BusinessMessagesPage } from '@/components/messages-page';
import { BusinessContentStudio } from '@/components/content-studio';

export default function SectionPage({ params }: { params: { section: string } }) {
  if (params.section === 'messages') return <BusinessMessagesPage />;
  if (params.section === 'content') return <BusinessContentStudio />;
  return <OperationsPage section={params.section} />;
}
