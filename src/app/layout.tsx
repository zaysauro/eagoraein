import type {Metadata} from 'next';import './globals.css';
export const metadata:Metadata={title:{default:'Agendaí — Sua agenda cheia. Sua cabeça livre.',template:'%s — Agendaí'},description:'Agendamentos online, profissionais e clientes em um só lugar. Organize seu estabelecimento com o Agendaí.',icons:{icon:'/logo.svg'}};
export default function RootLayout({children}:{children:React.ReactNode}){return <html lang="pt-BR"><body>{children}</body></html>}
