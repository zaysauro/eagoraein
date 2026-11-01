'use client';
import { useActionState } from 'react';
import { registerAction, recoverAction, redeemAction, inviteAction } from '@/actions/accounts';
export function AccountForm({kind,token}:{kind:'register'|'recover'|'redeem'|'invite';token?:string}){
 const actions={register:registerAction,recover:recoverAction,redeem:redeemAction,invite:inviteAction};
 const [state,action,pending]=useActionState(actions[kind],{error:null,success:false});
 return <form action={action} className="ag-form">
 {token&&<input type="hidden" name="token" value={token}/>}
 {(kind==='register'||kind==='redeem')&&<label>Seu nome<input name="name" required minLength={2} maxLength={100} autoComplete="name"/></label>}
 {kind==='register'&&<><label>Nome do estabelecimento<input name="company" required minLength={2} maxLength={100}/></label><label>Endereço da página de reservas<input name="slug" required pattern="[a-z0-9]+(-[a-z0-9]+)*" minLength={3} maxLength={60} placeholder="minha-empresa"/><small>/agendar/minha-empresa</small></label></>}
 {kind!=='redeem'&&<label>E-mail<input name="email" type="email" required autoComplete="email"/></label>}
 {(kind==='register'||kind==='redeem')&&<label>Senha<input name="password" type="password" required minLength={12} maxLength={72} autoComplete="new-password"/><small>Use pelo menos 12 caracteres.</small></label>}
 {state.error&&<p role="alert" className="ag-error">{state.error}</p>}
 {state.message&&<p role="status" className="ag-notice break-all">{state.message}</p>}
 <button className="ag-button" disabled={pending}>{pending?'Aguarde…':{register:'Criar minha empresa',recover:'Recuperar acesso',redeem:'Salvar senha',invite:'Gerar convite'}[kind]}</button>
 </form>;
}
