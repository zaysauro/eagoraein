import {allowAttempt} from "./rate-limit";
import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import { compare } from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { authConfig } from "@/lib/auth.config";

/**
 * Auth.js configuration LENGKAP (Node.js runtime).
 * Menggunakan authConfig sebagai base, ditambah Credentials provider.
 * Digunakan oleh Server Actions dan API routes.
 */
export const { handlers, auth: rawAuth, signIn, signOut } = NextAuth({
  ...authConfig,
  providers: [
    Credentials({
      name: "credentials",
      credentials: {
        email: { label: "E-mail", type: "email" },
        password: { label: "Senha", type: "password" },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) {
          return null;
        }

        const email = String(credentials.email).trim().toLowerCase();
        const password = String(credentials.password);
        if(password.length > 72 || email.length > 254) return null;

        if(!await allowAttempt("login",email,15)) return null;
        const user = await prisma.user.findUnique({
          where: { email },
        });

        if (!user || user.disabled) {
          return null;
        }

        const isPasswordValid = await compare(password, user.hashedPassword);

        if (!isPasswordValid) {
          return null;
        }

        return {
          id: user.id,
          email: user.email,
          sessionVersion: user.sessionVersion,
          name: user.name,
          role: user.role,
          clinicName: user.clinicName,
          organizationId: user.organizationId,
        };
      },
    }),
  ],
});

export async function auth() {
  const session = await rawAuth();
  if (!session?.user?.id) return null;
  const user = await prisma.user.findUnique({where:{id:session.user.id}, include:{organization:true}});
  if (!user || user.disabled || !user.organization || user.organization.suspended || user.sessionVersion !== (session.user.sessionVersion ?? 0)) return null;
  session.user.role=user.role;
  session.user.organizationId=user.organizationId;
  session.user.clinicName=user.organization.name;
  return session;
}
