"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { cancelBookingByPatient, rescheduleBookingByPatient } from "@/actions/booking-manage";

interface Props {
  token: string;
  canCancel: boolean;
  canReschedule: boolean;
  reason?: string;
  bookingStatus: string;
  rescheduleCount: number;
}

export default function PatientPortalClient({
  token,
  canCancel,
  canReschedule,
  reason,
  bookingStatus,
  rescheduleCount,
}: Props) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [showCancel, setShowCancel] = useState(false);
  const [showReschedule, setShowReschedule] = useState(false);
  const [newDate, setNewDate] = useState("");
  const [newTime, setNewTime] = useState("");

  const isActive = ["PENDING", "CONFIRMED"].includes(bookingStatus);

  if (!isActive) return null;

  const handleCancel = async () => {
    setLoading(true);
    setError(null);
    const result = await cancelBookingByPatient(token);
    if (result.success) {
      setSuccess("Agendamento cancelado.");
      setShowCancel(false);
      router.refresh();
    } else {
      setError(result.error || "Não foi possível cancelar.");
    }
    setLoading(false);
  };

  const handleReschedule = async () => {
    if (!newDate || !newTime) {
      setError("Escolha a nova data e o horário.");
      return;
    }
    setLoading(true);
    setError(null);
    const result = await rescheduleBookingByPatient(token, newDate, newTime);
    if (result.success) {
      setSuccess("Agendamento alterado!");
      setShowReschedule(false);
      setNewDate("");
      setNewTime("");
      router.refresh();
    } else {
      setError(result.error || "Não foi possível reagendar.");
    }
    setLoading(false);
  };

  // Minimum date for reschedule: tomorrow
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 2);
  const minDate = tomorrow.toISOString().split("T")[0];

  return (
    <div className="space-y-3">
      {/* Error / Success messages */}
      {error && (
        <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      )}
      {success && (
        <div className="rounded-xl border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-700">
          {success}
        </div>
      )}

      {/* Warning if cannot modify */}
      {reason && !canCancel && !canReschedule && (
        <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-700">
          ⚠️ {reason}
        </div>
      )}

      {/* Action buttons */}
      {(canCancel || canReschedule) && !showCancel && !showReschedule && (
        <div className="grid gap-3 sm:grid-cols-2">
          {canReschedule && (
            <button
              onClick={() => setShowReschedule(true)}
              className="rounded-xl border border-blue-200 bg-blue-50 px-4 py-3 text-sm font-medium text-blue-700 transition-colors hover:bg-blue-100"
            > Reagendar </button>
          )}
          {!canReschedule && rescheduleCount >= 1 && (
            <div className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-center text-xs text-slate-500"> O limite de reagendamentos foi atingido. <br /> Entre em contato com o estabelecimento. </div>
          )}
          {canCancel && (
            <button
              onClick={() => setShowCancel(true)}
              className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-700 transition-colors hover:bg-red-100"
            > Cancelar agendamento </button>
          )}
        </div>
      )}

      {/* Cancel confirmation */}
      {showCancel && (
        <div className="rounded-2xl border border-red-200 bg-white p-5 shadow-sm">
          <h3 className="mb-2 text-sm font-semibold text-red-800"> Deseja cancelar o agendamento? </h3>
          <p className="mb-4 text-xs text-slate-500"> O cancelamento libera o horário. Para retornar, faça um novo agendamento. </p>
          <div className="flex gap-2">
            <button
              onClick={handleCancel}
              disabled={loading}
              className="flex-1 rounded-xl bg-red-600 px-4 py-2.5 text-sm font-medium text-white transition-colors hover:bg-red-700 disabled:opacity-50"
            >
              {loading ? "Cancelando…" : "Sim, cancelar"}
            </button>
            <button
              onClick={() => setShowCancel(false)}
              disabled={loading}
              className="flex-1 rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-medium text-slate-700 transition-colors hover:bg-slate-50"
            > Voltar </button>
          </div>
        </div>
      )}

      {/* Reschedule form */}
      {showReschedule && (
        <div className="rounded-2xl border border-blue-200 bg-white p-5 shadow-sm">
          <h3 className="mb-1 text-sm font-semibold text-blue-800"> Escolher novo horário </h3>
          <p className="mb-4 text-xs text-slate-500"> Escolha um horário com pelo menos 24 horas de antecedência. É permitido um reagendamento. </p>

          <div className="mb-3 space-y-3">
            <div>
              <label className="mb-1 block text-xs font-medium text-slate-600"> Nova data </label>
              <input
                type="date"
                min={minDate}
                value={newDate}
                onChange={(e) => setNewDate(e.target.value)}
                className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm focus:border-blue-400 focus:outline-none focus:ring-2 focus:ring-blue-100"
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-slate-600"> Novo horário </label>
              <input
                type="time"
                value={newTime}
                onChange={(e) => setNewTime(e.target.value)}
                className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm focus:border-blue-400 focus:outline-none focus:ring-2 focus:ring-blue-100"
              />
              <p className="mt-1 text-[10px] text-slate-400"> Escolha um horário dentro da disponibilidade do profissional. Horários ocupados serão recusados. </p>
            </div>
          </div>

          <div className="flex gap-2">
            <button
              onClick={handleReschedule}
              disabled={loading || !newDate || !newTime}
              className="flex-1 rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-medium text-white transition-colors hover:bg-blue-700 disabled:opacity-50"
            >
              {loading ? "Processando…" : "Reagendar"}
            </button>
            <button
              onClick={() => { setShowReschedule(false); setError(null); }}
              disabled={loading}
              className="flex-1 rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-medium text-slate-700 transition-colors hover:bg-slate-50"
            > Voltar </button>
          </div>
        </div>
      )}
    </div>
  );
}
