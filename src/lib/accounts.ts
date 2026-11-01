import { randomBytes, createHash } from 'node:crypto';
import { hash } from 'bcryptjs';
import { z } from 'zod';
import { prisma } from './prisma';
export const registrationSchema=z.object({name:z.string().trim().min(2).max(100),company:z.string().trim().min(2).max(100),slug:z.string().regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/).min(3).max(60),email:z.string().email().transform(s=>s.toLowerCase().trim()),password:z.string().min(12).max(72)});
export async function registerCompany(input:unknown) {
 const data=registrationSchema.parse(input);const hashedPassword=await hash(data.password,12);
 return prisma.$transaction(async db=>{
  const org=await db.organization.create({data:{name:data.company,slug:data.slug}});
  const user=await db.user.create({data:{email:data.email,name:data.name,hashedPassword,organizationId:org.id,role:'OWNER',clinicName:org.name}});
  await db.auditEvent.create({data:{organizationId:org.id,actorId:user.id,action:'COMPANY_CREATED'}});
  return {id:org.id,slug:org.slug,userId:user.id};
 });
}
export function tokenHash(token:string){return createHash('sha256').update(token).digest('hex');}
export async function issueToken(kind:'RESET'|'INVITE',email:string,organizationId?:string){
 const token=randomBytes(32).toString('hex');
 await prisma.accessToken.create({data:{tokenHash:tokenHash(token),kind,email:email.toLowerCase().trim(),organizationId,expiresAt:new Date(Date.now()+ (kind==='RESET'?3600000:172800000))}});
 return token;
}
export async function redeemToken(token:string,password:string,name?:string){
 z.string().min(12).max(72).parse(password);z.string().length(64).parse(token);
 const hashedPassword=await hash(password,12);
 return prisma.$transaction(async db=>{
  const access=await db.accessToken.findUnique({where:{tokenHash:tokenHash(token)}});
  if(!access || access.usedAt || access.expiresAt < new Date()) throw new Error('Link inválido ou expirado.');
  const used=await db.accessToken.updateMany({where:{id:access.id,usedAt:null,expiresAt:{gt:new Date()}},data:{usedAt:new Date()}});
  if(used.count!==1) throw new Error('Link já utilizado.');
  if(access.kind==='RESET') await db.user.update({where:{email:access.email},data:{hashedPassword,sessionVersion:{increment:1}}});
  else {
   if(!access.organizationId) throw new Error('Convite inválido.');
   await db.user.create({data:{email:access.email,name:z.string().min(2).max(100).parse(name),hashedPassword,role:'STAFF',organizationId:access.organizationId}});
  }
 });
}
