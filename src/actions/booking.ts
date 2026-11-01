"use server";

import {allowAttempt} from "@/lib/rate-limit";
import { prisma } from "@/lib/prisma";
import { z } from "zod";
import { getAvailableSlots, ScheduleSession, DateOverrideData, ExistingBooking } from "@/lib/slots";
import { parse, startOfDay, addMinutes, format } from "date-fns";
import { notifyBookingReceived } from "@/lib/whatsapp";
import { getPaymentProvider, isPaymentEnabled, calculatePaymentAmount } from "@/lib/payment/core";


// ============================================================
// Schema Validasi (Lapis 1: Zod)
// ============================================================

const bookingSchema = z.object({
  serviceTypeId: z.string().min(1, "Escolha um serviço."),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Data inválida."),
  startTime: z.string().regex(/^\d{2}:\d{2}$/, "Horário inválido."),
  patientName: z
    .string()
    .min(2, "O nome deve ter pelo menos 2 caracteres.")
    .max(100, "Nome muito longo."),
  patientPhone: z
    .string()
    .min(10, "Informe o telefone com DDD.")
    .max(20, "Telefone muito longo.")
    .regex(/^[0-9+()\-\s]+$/, "Telefone inválido."),
  patientNotes: z.string().max(500, "Observação muito longa.").optional(),
});

// ============================================================
// Server Action: createBooking
// Anti Double-Booking 3 Lapis:
// 1. Validasi Zod
// 2. Re-check slot availability
// 3. DB unique constraint catch (P2002)
// ============================================================

export interface BookingResult {
  success: boolean;
  error: string | null;
  bookingId: string | null;
  summary: {
    serviceName: string;
    date: string;
    time: string;
    patientName: string;
    paymentUrl?: string; // URL redirect ke gateway pembayaran
    totalPrice?: number;
    manageUrl?: string;  // URL portal pasien (self-service)
  } | null;
}

export async function createBookingAction(
  _prevState: BookingResult,
  formData: FormData
): Promise<BookingResult> {
  const empty: BookingResult = { success: false, error: null, bookingId: null, summary: null };

  try {
    // ============================================
    // LAPIS 1: Validasi Zod
    // ============================================
    const raw = {
      serviceTypeId: formData.get("serviceTypeId") as string,
      date: formData.get("date") as string,
      startTime: formData.get("startTime") as string,
      patientName: formData.get("patientName") as string,
      patientPhone: formData.get("patientPhone") as string,
      patientNotes: (formData.get("patientNotes") as string) || undefined,
    };

    const parsed = bookingSchema.safeParse(raw);
    if (!parsed.success) {
      const firstError = parsed.error.issues[0]?.message || "Dados inválidos.";
      return { ...empty, error: firstError };
    }

    const { serviceTypeId, date, startTime, patientName, patientPhone, patientNotes } = parsed.data;

    if(!await allowAttempt("booking",patientPhone.replace(/\D/g,""),10)) return {...empty,error:"Muitas tentativas. Tente novamente em alguns minutos."};
    // Ambil data layanan
    const service = await prisma.serviceType.findUnique({
      where: { id: serviceTypeId, isActive: true, user:{disabled:false,organization:{suspended:false}} },
      select: { duration: true, bufferTime: true, userId: true, name: true, price: true, dpPercentage: true },
    });

    if (!service) {
      return { ...empty, error: "Serviço não encontrado." };
    }

    // Ambil nama klinik/bisnis dan orgId dari pemilik
    const owner = await prisma.user.findUnique({
      where: { id: service.userId },
      select: { clinicName: true, organizationId: true },
    });

    // Hitung waktu mulai dan selesai
    const targetDate = parse(date, "yyyy-MM-dd", new Date());
    const refDate = startOfDay(targetDate);
    const slotStart = parse(startTime, "HH:mm", refDate);
    const slotEnd = addMinutes(slotStart, service.duration);

    // ============================================
    // LAPIS 2: Re-check slot sebelum insert
    // ============================================
    const [schedules, overrides, bookings] = await Promise.all([
      prisma.schedule.findMany({
        where: { userId: service.userId, isActive: true },
        select: { dayOfWeek: true, startTime: true, endTime: true },
      }),
      prisma.dateOverride.findMany({
        where: { userId: service.userId },
        select: { date: true, isBlocked: true, startTime: true, endTime: true },
      }),
      prisma.booking.findMany({
        where: {
          userId: service.userId,
          date: refDate,
          status: { in: ["PENDING", "CONFIRMED"] },
        },
        select: { startTime: true, endTime: true, serviceType: { select: { bufferTime: true } } },
      }),
    ]);

    const scheduleSessions: ScheduleSession[] = schedules.map((s: { dayOfWeek: number; startTime: string; endTime: string }) => ({
      dayOfWeek: s.dayOfWeek,
      startTime: s.startTime,
      endTime: s.endTime,
    }));

    const dateOverrides: DateOverrideData[] = overrides.map((o: { date: Date; isBlocked: boolean; startTime: string | null; endTime: string | null }) => ({
      date: parse(o.date.toISOString().slice(0,10), "yyyy-MM-dd", new Date()),
      isBlocked: o.isBlocked,
      startTime: o.startTime,
      endTime: o.endTime,
    }));

    const existingBookings: ExistingBooking[] = bookings.map((b: { startTime: Date; endTime: Date; serviceType: { bufferTime: number } }) => ({
      startTime: b.startTime,
      endTime: b.endTime,
      bufferTime: b.serviceType.bufferTime,
    }));

    const availableSlots = getAvailableSlots(
      targetDate,
      scheduleSessions,
      dateOverrides,
      existingBookings,
      service.duration,
      service.bufferTime
    );

    const isSlotAvailable = availableSlots.some(
      (slot) => slot.startTime === startTime && slot.available
    );

    if (!isSlotAvailable) {
      return {
        ...empty,
        error: "Este horário não está mais disponível. Escolha outro.",
      };
    }

    // ============================================
    // LAPIS 3: Insert dengan DB constraint catch
    // ============================================
    try {
      // Hitung harga & DP
      const isPaid = service.price > 0;
      const paymentAmount = isPaid
        ? calculatePaymentAmount(service.price, service.dpPercentage)
        : 0;

      const booking = await prisma.$transaction(async (db) => {
      const saved = await db.booking.create({
        data: {
          userId: service.userId,
          serviceTypeId,
          date: refDate,
          startTime: slotStart,
          endTime: slotEnd,
          patientName,
          patientPhone,
          patientNotes: patientNotes || null,
          status: "PENDING",
          // Payment fields
          paymentStatus: "UNPAID", // Gratis = otomatis PAID
          totalPrice: service.price,
          dpAmount: 0,
        },
      });

      if (owner?.organizationId) await db.customer.upsert({
        where:{organizationId_phone:{organizationId:owner.organizationId,phone:patientPhone.replace(/\D/g,"")}},
        create:{organizationId:owner.organizationId,name:patientName,phone:patientPhone.replace(/\D/g,"")},
        update:{}
      });
      return saved;
      });
      // Jika layanan berbayar dan gateway dikonfigurasi → buat transaksi
      let paymentUrl: string | undefined;
      if (isPaid && await isPaymentEnabled(owner?.organizationId)) {
        try {
          const provider = getPaymentProvider(owner?.organizationId);
          const txResult = await provider.createTransaction({
            bookingId: booking.id,
            amount: paymentAmount,
            customerName: patientName,
            customerPhone: patientPhone,
            serviceName: service.name,
            merchantName: owner?.clinicName || undefined,
          });

          if (txResult.success && txResult.paymentRefId) {
            // Update booking dengan data pembayaran
            await prisma.booking.update({
              where: { id: booking.id },
              data: {
                paymentGateway: provider.name,
                paymentRefId: txResult.paymentRefId,
                paymentUrl: txResult.paymentUrl || null,
              },
            });
            paymentUrl = txResult.paymentUrl;
          }
        } catch (paymentErr) {
          // Payment gateway error tidak membatalkan booking
          console.error("[Payment] Gateway error (booking tetap dibuat):", paymentErr);
        }
      }

      // Fire-and-forget WhatsApp notification
      const appUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
      const manageUrl = `${appUrl}/booking/manage/${booking.managementToken}`;

      notifyBookingReceived({
        patientName,
        patientPhone,
        serviceName: service.name,
        date: refDate,
        startTime: format(slotStart, "HH:mm"),
        duration: service.duration,
        clinicName: owner?.clinicName || undefined,
        manageUrl,
      });

      return {
        success: true,
        error: null,
        bookingId: booking.id,
        summary: {
          serviceName: service.name,
          date,
          time: startTime,
          patientName,
          paymentUrl,
          totalPrice: isPaid ? paymentAmount : undefined,
          manageUrl,
        },
      };
    } catch (dbError: unknown) {
      // Tangkap unique constraint violation (race condition)
      const isPrismaUniqueError =
        dbError instanceof Error &&
        "code" in dbError &&
        (dbError as { code: string }).code === "P2002";

      if (isPrismaUniqueError) {
        return {
          ...empty,
          error: "Este horário acabou de ser reservado. Escolha outro.",
        };
      }
      throw dbError; // Re-throw unexpected errors
    }
  } catch {
    return {
      ...empty,
      error: "Não foi possível concluir a operação. Tente novamente.",
    };
  }
}
