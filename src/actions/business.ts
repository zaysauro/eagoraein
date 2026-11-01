'use server';
import {withTenant} from '@/lib/tenant';import {auth} from '@/lib/auth';import {z} from 'zod';import {revalidatePath} from 'next/cache';
export async function getBusiness(){return withTenant(async db=>db.organization.findFirst({select:{id:true,name:true,slug:true,description:true,brandColor:true,contactPhone:true,plan:true,subscriptionStatus:true,trialEndsAt:true}}))}
export async function saveBusiness(_: {error:string|null;success:boolean},form:FormData){
 try{const session=await auth();if(session?.user.role!=='OWNER')throw new Error('Acesso restrito');const data=z.object({name:z.string().trim().min(2).max(100),description:z.string().max(500),brandColor:z.string().regex(/^#[0-9a-fA-F]{6}$/),contactPhone:z.string().max(30)}).parse(Object.fromEntries(form));await withTenant(db=>db.organization.update({where:{id:session.user.organizationId!},data}));revalidatePath('/admin/settings');return {success:true,error:null};}catch{return {success:false,error:'Não foi possível salvar. Confira os campos e suas permissões.'};}
}
export async function saveCustomer(_: {error:string|null;success:boolean},form:FormData){
 try{const session=await auth();if(session?.user.role!=='OWNER'||!session.user.organizationId)throw new Error('Acesso restrito');const data=z.object({name:z.string().trim().min(2).max(100),phone:z.string().transform(s=>s.replace(/\D/g,'')).pipe(z.string().min(10).max(15)),email:z.string().email().or(z.literal('')),notes:z.string().max(2000),preferences:z.string().max(1000)}).parse(Object.fromEntries(form));await withTenant(async db=>{
 await db.customer.upsert({where:{organizationId_phone:{organizationId:session.user.organizationId!,phone:data.phone}},create:{...data,organizationId:session.user.organizationId!},update:data});
 await db.auditEvent.create({data:{organizationId:session.user.organizationId!,actorId:session.user.id,action:'CUSTOMER_SAVED'}});
 });revalidatePath('/admin/customers');return {success:true,error:null};}catch{return {success:false,error:'Não foi possível salvar o cliente. Confira nome, telefone e e-mail.'};}
}
export async function getCustomers(search='',inactiveDays=0){
 const session=await auth();if(session?.user.role!=='OWNER')return [];
 return withTenant(async db=>{const customers=await db.customer.findMany({where:{OR:[{name:{contains:search,mode:'insensitive'}},{phone:{contains:search}}]},orderBy:{name:'asc'},take:500});const bookings=await db.booking.findMany({select:{patientPhone:true,date:true,status:true,serviceType:{select:{name:true}}},orderBy:{date:'desc'}});return customers.map(c=>{const history=bookings.filter(b=>b.patientPhone.replace(/\D/g,'')===c.phone);const visits=history.filter(b=>b.status==='COMPLETED');return {...c,visits:visits.length,lastVisit:visits[0]?.date??null,history:history.slice(0,20)}}).filter(c=>!inactiveDays||!c.lastVisit||c.lastVisit<new Date(Date.now()-inactiveDays*86400000));});
}
