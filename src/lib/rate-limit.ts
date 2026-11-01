import {createHash} from 'node:crypto';import {prisma} from './prisma';
/** Shared, atomic window counter; no in-memory limits on serverless instances. */
export async function allowAttempt(category:string,identity:string,limit:number,windowSeconds=900){
 const key=createHash('sha256').update(category+':'+identity.toLowerCase().trim()).digest('hex');
 const rows=await prisma.$queryRaw<{attempts:number}[]>`INSERT INTO rate_limits(key,attempts,reset_at) VALUES (${key},1,now()+${windowSeconds}*interval '1 second') ON CONFLICT(key) DO UPDATE SET attempts=CASE WHEN rate_limits.reset_at<now() THEN 1 ELSE rate_limits.attempts+1 END, reset_at=CASE WHEN rate_limits.reset_at<now() THEN now()+${windowSeconds}*interval '1 second' ELSE rate_limits.reset_at END RETURNING attempts`;
 return rows[0].attempts<=limit;
}
