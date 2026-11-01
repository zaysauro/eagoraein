import "dotenv/config";
import {prisma} from "../src/lib/prisma";
import {registerCompany} from "../src/lib/accounts";
async function main(){
 if(process.env.SEED_DEMO!=="true" || !process.env.SEED_PASSWORD || process.env.SEED_PASSWORD.length<12)throw new Error("Set SEED_DEMO=true and an explicit SEED_PASSWORD of at least 12 characters in an isolated database.");
 const org=await registerCompany({name:"Profissional demonstração",company:"Estabelecimento demonstração",slug:"demonstracao",email:"demo@example.test",password:process.env.SEED_PASSWORD});
 await prisma.serviceType.create({data:{userId:org.userId,name:"Serviço demonstrativo",duration:30,bufferTime:10,price:4500}});
 await prisma.schedule.createMany({data:[1,2,3,4,5].map(dayOfWeek=>({userId:org.userId,dayOfWeek,startTime:"09:00",endTime:"18:00"}))});
 console.log("Empresa demonstrativa criada; nenhum cliente ou faturamento fictício foi inserido.");
}
main().finally(()=>prisma.$disconnect());
