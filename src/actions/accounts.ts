'use server';
import {allowAttempt} from '@/lib/rate-limit';
import {headers} from 'next/headers';
import { registerCompany, issueToken, redeemToken } from '@/lib/accounts';
import { prisma } from '@/lib/prisma';
import { auth } from '@/lib/auth';
import { z } from 'zod';
export type AccountState={error:string|null;success:boolean;message?:string};
export async function registerAction(_:AccountState, form:FormData):Promise<AccountState>{
 try {const ip=(await headers()).get('x-forwarded-for')?.split(',')[0]??'unknown';if(!await allowAttempt('register',ip,10,3600))throw new Error('Limite de tentativas');await registerCompany(Object.fromEntries(form));return {error:null,success:true,message:'Empresa criada! Entre para configurar seus serviços e horários.'};}
 catch{return {error:'Não foi possível cadastrar. Confira os campos; e-mail e endereço da empresa devem ser únicos. A senha precisa ter 12 a 72 caracteres.',success:false};}
}
export async function recoverAction(_:AccountState,form:FormData):Promise<AccountState>{
 const email=z.string().email().safeParse(form.get('email'));
 if(!email.success)return {error:'Informe um e-mail válido.',success:false};
 // No link is exposed publicly and no email is claimed to have been sent.
 if(!process.env.RESEND_API_KEY || process.env.EMAIL_SEND_ENABLED!=='true')return {error:'Recuperação por e-mail ainda não configurada. Entre em contato com o administrador da plataforma.',success:false};
 if(!await allowAttempt('recover',email.data,3,3600))return {success:true,error:null,message:'Se o endereço estiver cadastrado, você receberá instruções.'};
 const user=await prisma.user.findUnique({where:{email:email.data.toLowerCase()}});
 if(user){
  const token=await issueToken('RESET',user.email);
  const url=`${process.env.NEXT_PUBLIC_APP_URL}/acesso?token=${token}`;
  const response=await fetch('https://api.resend.com/emails',{method:'POST',headers:{Authorization:`Bearer ${process.env.RESEND_API_KEY}`,'Content-Type':'application/json'},body:JSON.stringify({from:process.env.EMAIL_FROM,to:user.email,subject:'Redefinir senha do Agendaí',text:`Acesse ${url}. O link expira em uma hora. Se você não solicitou, ignore esta mensagem.`}),signal:AbortSignal.timeout(10000)});
  if(!response.ok)return {error:'Serviço de e-mail indisponível. Tente novamente mais tarde.',success:false};
 }
 return {success:true,error:null,message:'Se o endereço estiver cadastrado, você receberá instruções de recuperação.'};
}
export async function redeemAction(_:AccountState,form:FormData):Promise<AccountState>{
 try{await redeemToken(String(form.get('token')),String(form.get('password')),String(form.get('name')));return {success:true,error:null,message:'Acesso atualizado. Entre com sua senha.'};}catch{return {success:false,error:'Não foi possível usar este link. Confira os campos e a validade do convite.'};}
}
export async function inviteAction(_:AccountState,form:FormData):Promise<AccountState>{
 const session=await auth();if(session?.user.role!=='OWNER'||!session.user.organizationId)return {success:false,error:'Acesso restrito ao proprietário.'};
 const email=z.string().email().safeParse(form.get('email'));if(!email.success)return {success:false,error:'E-mail inválido.'};
 const token=await issueToken('INVITE',email.data,session.user.organizationId);
 return {success:true,error:null,message:`Compartilhe este convite somente com o colaborador: ${process.env.NEXT_PUBLIC_APP_URL}/acesso?token=${token}`};
}
