import {notFound} from 'next/navigation';import {prisma} from '@/lib/prisma';import {getProviders} from '@/actions/slots';import {BookingWizard} from '@/components/booking/booking-wizard';
export default async function Page({params}:{params:Promise<{slug:string}>}){
 const {slug}=await params;const org=await prisma.organization.findUnique({where:{slug,suspended:false},select:{name:true,description:true,brandColor:true,contactPhone:true}});if(!org)notFound();
 const providers=await getProviders(slug);
 return <><header className="ag-business" style={{borderColor:org.brandColor}}><h1>{org.name}</h1><p>{org.description}</p>{org.contactPhone&&<p>Contato: {org.contactPhone}</p>}</header>{providers.length?<BookingWizard providers={providers}/>:<p className="ag-auth">Este estabelecimento ainda não disponibilizou horários e serviços.</p>}</>;
}
