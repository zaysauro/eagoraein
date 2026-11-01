"use server";

import { revalidatePath } from "next/cache";
import { withTenant } from "@/lib/tenant";
import { z } from "zod";
import { getDataScope } from "@/lib/rbac";

// ============================================================
// Schemas
// ============================================================

const createServiceSchema = z.object({
  name: z.string().min(2, "O serviço deve ter pelo menos 2 caracteres."),
  duration: z.number().int().min(5, "A duração mínima é de 5 minutos.").max(480, "A duração máxima é de 480 minutos."),
  bufferTime: z.number().int().min(0).max(60).default(0),
  price: z.number().int().min(0).default(0),
  dpPercentage: z.number().int().min(0).max(100).default(0),
  description: z.string().optional(),
  color: z.string().regex(/^#[0-9a-fA-F]{6}$/, "Use uma cor no formato hexadecimal (#RRGGBB).").optional(),
  isVirtual: z.literal(false).default(false),
});

const updateServiceSchema = createServiceSchema.extend({
  id: z.string(),
  isActive: z.boolean().optional(),
});

// ============================================================
// Action Result Type
// ============================================================

type ActionResult = { error: string | null; success: boolean };

// ============================================================
// Create Service
// ============================================================

export async function createServiceAction(
  _prevState: ActionResult,
  formData: FormData
): Promise<ActionResult> {
return withTenant(async (prisma) => {

  try {
    const scope = await getDataScope();
    if (!scope) return { error: "Acesso não autorizado", success: false };

    const raw = formData.get("payload") as string;
    const parsed = createServiceSchema.safeParse(JSON.parse(raw));

    if (!parsed.success) {
      return { error: parsed.error.issues[0]?.message || "Dados inválidos.", success: false };
    }

    const { name, duration, bufferTime, price, dpPercentage, description, color, isVirtual } = parsed.data;

    await prisma.serviceType.create({
      data: {
        name,
        duration,
        bufferTime,
        price,
        dpPercentage,
        description: description || null,
        color: color || null,
        isVirtual,
        userId: scope.currentUserId,
      },
    });

    revalidatePath("/admin/services");
    return { error: null, success: true };
  } catch {
    return { error: "Não foi possível criar o serviço. Confira os dados e os limites do plano.", success: false };
  }

});
}

// ============================================================
// Update Service
// ============================================================

export async function updateServiceAction(
  _prevState: ActionResult,
  formData: FormData
): Promise<ActionResult> {
return withTenant(async (prisma) => {

  try {
    const scope = await getDataScope();
    if (!scope) return { error: "Acesso não autorizado", success: false };

    const raw = formData.get("payload") as string;
    const parsed = updateServiceSchema.safeParse(JSON.parse(raw));

    if (!parsed.success) {
      return { error: parsed.error.issues[0]?.message || "Dados inválidos.", success: false };
    }

    const { id, name, duration, bufferTime, price, dpPercentage, description, color, isActive, isVirtual } = parsed.data;

    // Verify ownership (OWNER can edit any org member's service, STAFF only their own)
    const existing = await prisma.serviceType.findFirst({
      where: { id, ...scope.userFilter },
    });
    if (!existing) return { error: "Serviço não encontrado.", success: false };

    await prisma.serviceType.update({
      where: { id },
      data: {
        name,
        duration,
        bufferTime,
        price,
        dpPercentage,
        description: description || null,
        color: color || null,
        isVirtual,
        ...(isActive !== undefined ? { isActive } : {}),
      },
    });

    revalidatePath("/admin/services");
    return { error: null, success: true };
  } catch {
    return { error: "Não foi possível atualizar o serviço.", success: false };
  }

});
}

// ============================================================
// Delete Service
// ============================================================

export async function deleteServiceAction(serviceId: string): Promise<ActionResult> {
return withTenant(async (prisma) => {

  try {
    const scope = await getDataScope();
    if (!scope) return { error: "Acesso não autorizado", success: false };

    // Verify ownership
    const existing = await prisma.serviceType.findFirst({
      where: { id: serviceId, userId: scope.currentUserId },
    });
    if (!existing) return { error: "Serviço não encontrado.", success: false };

    // Check if service has bookings
    const bookingCount = await prisma.booking.count({
      where: { serviceTypeId: serviceId },
    });

    if (bookingCount > 0) {
      // Soft delete: deactivate instead
      await prisma.serviceType.update({
        where: { id: serviceId },
        data: { isActive: false },
      });
      revalidatePath("/admin/services");
      return { error: null, success: true };
    }

    await prisma.serviceType.delete({ where: { id: serviceId } });
    revalidatePath("/admin/services");
    return { error: null, success: true };
  } catch {
    return { error: "Não foi possível excluir o serviço.", success: false };
  }

});
}
