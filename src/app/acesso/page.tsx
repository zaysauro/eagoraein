import Link from 'next/link';import {AccountForm} from '@/components/account-form';
export default async function Page({searchParams}:{searchParams:Promise<{token?:string}>}){const {token}=await searchParams;return <main className="ag-auth"><h1>Definir sua senha</h1><AccountForm kind="redeem" token={token}/><Link href="/login">Entrar</Link></main>}
