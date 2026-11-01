import type {Prisma,Booking} from '@prisma/client';
import {test,after} from 'node:test';import assert from 'node:assert/strict';import {randomUUID} from 'node:crypto';import {prisma} from '../src/lib/prisma';import {registerCompany,issueToken,redeemToken} from '../src/lib/accounts';import {compare} from 'bcryptjs';
if(!process.env.DATABASE_URL?.includes('agendai_test')) throw new Error('Tests require an isolated agendai_test database');
const suffix=randomUUID().slice(0,8);const pw='Only-for-local-tests-456!';
after(()=>prisma.$disconnect());
async function scoped(org:string,user:string,role:string,fn:(db:Prisma.TransactionClient)=>Promise<unknown>){return prisma.$transaction(async db=>{await db.$executeRawUnsafe('SET LOCAL ROLE agendai_tenant');await db.$queryRaw`SELECT set_config('app.organization_id',${org},true),set_config('app.user_id',${user},true),set_config('app.role',${role},true)`;return fn(db);});}
test('registration, tenant RLS, plans, concurrent booking and one-time tokens',async t=>{
 const a=await registerCompany({name:'Ana teste',company:'Empresa A teste',slug:`teste-a-${suffix}`,email:`a-${suffix}@example.test`,password:pw});
 const b=await registerCompany({name:'Bruno teste',company:'Empresa B teste',slug:`teste-b-${suffix}`,email:`b-${suffix}@example.test`,password:pw});
 const user=await prisma.user.findUniqueOrThrow({where:{id:a.userId}});
 await t.test('password stored as bcrypt hash',async()=>{assert.notEqual(user.hashedPassword,pw);assert.equal(await compare(pw,user.hashedPassword),true);assert.equal(await compare('wrong',user.hashedPassword),false)});
 const service=await prisma.serviceType.create({data:{name:'Corte teste',duration:30,bufferTime:15,price:4500,userId:a.userId}});
 const other=await prisma.serviceType.create({data:{name:'Serviço confidencial B',duration:30,userId:b.userId}});
 await t.test('tenant A cannot read or change tenant B records',async()=>{
  await scoped(a.id,a.userId,'OWNER',async db=>{assert.equal((await db.serviceType.findMany()).some((s: {id:string})=>s.id===other.id),false);const changed=await db.serviceType.updateMany({where:{id:other.id},data:{price:1}});assert.equal(changed.count,0);assert.equal((await db.organization.findMany()).length,1)});
  await assert.rejects(scoped(a.id,a.userId,'OWNER',db=>db.serviceType.create({data:{name:'Illegal cross-tenant',userId:b.userId,duration:30}})));
 });
 await t.test('client cannot change its subscription under tenant role',async()=>{await assert.rejects(scoped(a.id,a.userId,'OWNER',db=>db.organization.update({where:{id:a.id},data:{plan:'EQUIPE'}})))});
 await t.test('individual plan enforces staff limit in database',async()=>{await assert.rejects(prisma.user.create({data:{name:'Extra',email:`extra-${suffix}@example.test`,hashedPassword:user.hashedPassword,organizationId:a.id}}))});
 const bookingData={userId:a.userId,serviceTypeId:service.id,date:new Date('2030-01-07'),startTime:new Date('2030-01-07T12:00:00Z'),endTime:new Date('2030-01-07T12:30:00Z'),patientName:'Cliente teste',patientPhone:'11999990000',totalPrice:4500};
 let winner:string;
 await t.test('eight simultaneous reservations yield exactly one winner',async()=>{const results=await Promise.allSettled(Array.from({length:8},()=>prisma.booking.create({data:bookingData})));assert.equal(results.filter(r=>r.status==='fulfilled').length,1);winner=(results.find(r=>r.status==='fulfilled') as PromiseFulfilledResult<Booking>).value.id;assert.equal(await prisma.booking.count({where:{userId:a.userId}}),1)});
 await t.test('buffer interval is enforced by PostgreSQL',async()=>{await assert.rejects(prisma.booking.create({data:{...bookingData,startTime:new Date('2030-01-07T12:30:00Z'),endTime:new Date('2030-01-07T13:00:00Z')}}))});
 await t.test('service cannot be combined with provider from another company',async()=>{await assert.rejects(prisma.booking.create({data:{...bookingData,userId:b.userId}}))});
 await t.test('cancellation frees the slot and rescheduling persists',async()=>{await prisma.booking.update({where:{id:winner},data:{status:'CANCELLED'}});const replacement=await prisma.booking.create({data:bookingData});await prisma.booking.update({where:{id:replacement.id},data:{startTime:new Date('2030-01-07T14:00:00Z'),endTime:new Date('2030-01-07T14:30:00Z'),rescheduleCount:{increment:1}}});assert.equal((await prisma.booking.findUniqueOrThrow({where:{id:replacement.id}})).rescheduleCount,1)});
 await t.test('password reset is single use and revokes existing sessions',async()=>{const token=await issueToken('RESET',user.email);await redeemToken(token,'Another-test-password-789!');await assert.rejects(redeemToken(token,pw));assert.equal((await prisma.user.findUniqueOrThrow({where:{id:a.userId}})).sessionVersion,1)});
 await t.test('suspension rejects new bookings at database boundary',async()=>{await prisma.organization.update({where:{id:a.id},data:{suspended:true}});await assert.rejects(prisma.booking.create({data:{...bookingData,startTime:new Date('2030-01-08T12:00:00Z'),endTime:new Date('2030-01-08T12:30:00Z')}}))});
});
