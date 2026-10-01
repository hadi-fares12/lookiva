import { AdminOperationsPage } from '@/components/admin-operations-page';
export default function SectionPage({params}:{params:{section:string}}){ return <AdminOperationsPage section={params.section}/>; }
