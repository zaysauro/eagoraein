import { prisma } from './prisma';
import { auth } from './auth';
import type { Prisma } from '@prisma/client';

/** Every administrative query runs with PostgreSQL RLS in a transaction.
 * The NOLOGIN role is provisioned by scripts/provision-role.sql.
 * Identity is always derived from a freshly revalidated session, never a form.
 */
export async function withTenant<T>(work: (db: Prisma.TransactionClient) => Promise<T>): Promise<T> {
  const session = await auth();
  if (!session?.user?.id || !session.user.organizationId) throw new Error('Sessão inválida');
  return prisma.$transaction(async db => {
    await db.$executeRawUnsafe('SET LOCAL ROLE agendai_tenant');
    await db.$queryRaw`SELECT set_config('app.organization_id', ${session.user.organizationId!}, true), set_config('app.user_id', ${session.user.id!}, true), set_config('app.role', ${session.user.role}, true)`;
    return work(db);
  }, { timeout: 15000 });
}
