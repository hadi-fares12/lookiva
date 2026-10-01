import { OperationsPage } from '@/components/operations-page';

export default function SectionPage({ params }: { params: { section: string } }) {
  return <OperationsPage section={params.section} />;
}
