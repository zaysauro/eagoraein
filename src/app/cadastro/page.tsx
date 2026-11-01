import Link from 'next/link';import {AccountForm} from '@/components/account-form';
export default function Page(){return <main className="ag-auth"><Link href="/" className="ag-logo">agendaí<span>●</span></Link><h1>Seu negócio, no seu tempo.</h1><p>Comece com 14 dias de avaliação. Sem cartão.</p><AccountForm kind="register"/><p>Já tem uma conta? <Link href="/login">Entrar</Link></p></main>}
