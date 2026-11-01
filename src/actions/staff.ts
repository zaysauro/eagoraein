"use server";

import { withTenant } from "@/lib/tenant";
import { auth } from "@/lib/auth";
import { hash } from "bcryptjs";
import { z } from "zod";
import { revalidatePath } from "next/cache";

// ============================================================
// Get Staff Members (OWNER only)
// ============================================================
export async function getStaffMembers() {
return withTenant(async (prisma) => {

  const session = await auth();
  if (!session?.user?.id || session.user.role !== "OWNER") return [];

  const orgId = session.user.organizationId;
  if (!orgId) return [];

  return prisma.user.findMany({
    where: { organizationId: orgId, disabled:false },
    select: {
      id: true,
      name: true,
      email: true,
      role: true,
      createdAt: true,
      _count: { select: { serviceTypes: true, bookings: true } },
    },
    orderBy: [{ role: "asc" }, { name: "asc" }],
  });

});
}

// ============================================================
// Create Staff (OWNER only)
// ============================================================

const createStaffSchema = z.object({
  name: z.string().min(2, "O nome deve ter pelo menos 2 caracteres.").max(100),
  email: z.string().email("E-mail inválido."),
  password: z.string().min(12, "A senha deve ter pelo menos 12 caracteres."),
});

export interface CreateStaffResult {
  success: boolean;
  error: string | null;
}

export async function createStaffAction(
  _prevState: CreateStaffResult,
  formData: FormData
): Promise<CreateStaffResult> {
return withTenant(async (prisma) => {

  const session = await auth();
  if (!session?.user?.id || session.user.role !== "OWNER") {
    return { success: false, error: "Somente o proprietário pode cadastrar profissionais." };
  }

  const orgId = session.user.organizationId;
  if (!orgId) {
    return { success: false, error: "Sua conta não está vinculada a uma empresa." };
  }

  const raw = {
    name: formData.get("name") as string,
    email: formData.get("email") as string,
    password: formData.get("password") as string,
  };

  const parsed = createStaffSchema.safeParse(raw);
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0]?.message || "Dados inválidos." };
  }

  const { name, email, password } = parsed.data;

  // Check duplicate email
  const existing = await prisma.user.findUnique({
    where: { email },
    select: { id: true },
  });
  if (existing) {
    return { success: false, error: "Este e-mail já está cadastrado." };
  }

  const hashedPassword = await hash(password, 10);

  // Get org for clinicName
  const org = await prisma.organization.findUnique({
    where: { id: orgId },
    select: { name: true },
  });

  await prisma.user.create({
    data: {
      name,
      email,
      hashedPassword,
      role: "STAFF",
      organizationId: orgId,
      clinicName: org?.name || null,
    },
  });

  revalidatePath("/admin/staff");
  return { success: true, error: null };

});
}

// ============================================================
// Update Staff (OWNER only) — name, email, role
// ============================================================

const updateStaffSchema = z.object({
  name: z.string().min(2, "O nome deve ter pelo menos 2 caracteres.").max(100),
  email: z.string().email("E-mail inválido."),
  role: z.enum(["OWNER", "STAFF"], { message: "Escolha uma permissão válida." }),
  password: z.string().min(12, "A senha deve ter pelo menos 12 caracteres.").optional().or(z.literal("")),
});

export async function updateStaffAction(
  staffId: string,
  formData: FormData
): Promise<CreateStaffResult> {
return withTenant(async (prisma) => {

  const session = await auth();
  if (!session?.user?.id || session.user.role !== "OWNER") {
    return { success: false, error: "Acesso não autorizado" };
  }

  const orgId = session.user.organizationId;
  if (!orgId) return { success: false, error: "Empresa não encontrada." };

  const raw = {
    name: formData.get("name") as string,
    email: formData.get("email") as string,
    role: formData.get("role") as string,
    password: (formData.get("password") as string) || "",
  };

  const parsed = updateStaffSchema.safeParse(raw);
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0]?.message || "Dados inválidos." };
  }

  // Verify staff belongs to this org
  const staff = await prisma.user.findFirst({
    where: { id: staffId, organizationId: orgId },
  });
  if (!staff) return { success: false, error: "Profissional não encontrado." };

  // Check email conflict (if changed)
  if (parsed.data.email !== staff.email) {
    const existing = await prisma.user.findUnique({
      where: { email: parsed.data.email },
      select: { id: true },
    });
    if (existing) {
      return { success: false, error: "Este e-mail já está em uso." };
    }
  }

  // Prevent demoting yourself
  if (staffId === session.user.id && parsed.data.role === "STAFF") {
    return { success: false, error: "Você não pode remover sua própria permissão de proprietário." };
  }

  // Build update data
  const updateData: Record<string, unknown> = {
    name: parsed.data.name,
    email: parsed.data.email,
    role: parsed.data.role,
  };

  // Hash new password if provided
  if (parsed.data.password && parsed.data.password.length >= 12) {
    updateData.hashedPassword = await hash(parsed.data.password, 12);
    updateData.sessionVersion = {increment:1};
  }

  await prisma.user.update({
    where: { id: staffId },
    data: updateData,
  });

  revalidatePath("/admin/staff");
  return { success: true, error: null };

});
}

// ============================================================
// Delete Staff (OWNER only)
// ============================================================

export async function deleteStaffAction(staffId: string): Promise<CreateStaffResult> {
return withTenant(async (prisma) => {

  const session = await auth();
  if (!session?.user?.id || session.user.role !== "OWNER") {
    return { success: false, error: "Acesso não autorizado" };
  }

  const orgId = session.user.organizationId;
  if (!orgId) return { success: false, error: "Empresa não encontrada." };

  // Verify staff belongs to this org + not self
  const staff = await prisma.user.findFirst({
    where: { id: staffId, organizationId: orgId },
  });
  if (!staff) return { success: false, error: "Profissional não encontrado." };

  if (staffId === session.user.id) {
    return { success: false, error: "Você não pode excluir sua própria conta." };
  }

  if (staff.role === "OWNER") {
    return { success: false, error: "Não é permitido excluir um proprietário." };
  }

  await prisma.user.update({where:{id:staffId},data:{disabled:true,sessionVersion:{increment:1}}});
  await prisma.serviceType.updateMany({where:{userId:staffId},data:{isActive:false}});

  revalidatePath("/admin/staff");
  return { success: true, error: null };

});
}
