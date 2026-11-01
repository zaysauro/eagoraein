import {redirect} from 'next/navigation';import {auth} from '@/lib/auth';import {AdminSidebar} from '@/components/admin/sidebar';
export default async function Layout({children}:{children:React.ReactNode}){const session=await auth();if(!session?.user)redirect('/login');return <div className="ag-shell"><AdminSidebar user={session.user}/><main className="ag-main">{children}</main></div>}
