import Link from 'next/link';import {AccountForm} from '@/components/account-form';
export default function Page(){return <main className="ag-auth"><h1>Recuperar acesso</h1><AccountForm kind="recover"/><Link href="/login">Voltar para entrar</Link></main>}
