import { AccountPage } from '@/components/account-page';
export default function DynamicAccountPage({params}:{params:{section:string}}){return <AccountPage section={params.section}/>;}
