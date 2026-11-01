/** Google integration is disabled pending OAuth security and provider validation. */
export async function pushBookingToCalendar(info:{isVirtual?:boolean;[key:string]:unknown}):Promise<string|null>{if(info.isVirtual)throw new Error('Google Calendar não configurado e validado.');return null;}
