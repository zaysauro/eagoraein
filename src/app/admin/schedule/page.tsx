import { getSchedules } from "@/actions/schedule";
import { getDateOverrides } from "@/actions/date-override";
import { ScheduleEditor } from "@/components/admin/schedule-editor";
import { DateOverrideManager } from "@/components/admin/date-override-manager";

export default async function SchedulePage() {
  const [schedules, overrides] = await Promise.all([
    getSchedules(),
    getDateOverrides(),
  ]);

  const initialSessions = schedules.map((s) => ({
    dayOfWeek: s.dayOfWeek,
    startTime: s.startTime,
    endTime: s.endTime,
  }));

  return (
    <div>
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-slate-900 dark:text-white"> Disponibilidade </h1>
        <p className="mt-1 text-sm text-slate-500 dark:text-slate-400"> Configure seus horários semanais, feriados e bloqueios de datas. </p>
      </div>

      <div className="grid gap-8 lg:grid-cols-5">
        {/* Kolom Kiri: Jadwal Mingguan */}
        <div className="lg:col-span-3">
          <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900">
            <div className="mb-4 flex items-center gap-2">
              <svg className="h-5 w-5 text-blue-600 dark:text-blue-400" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" />
              </svg>
              <h2 className="text-lg font-semibold text-slate-900 dark:text-white"> Horários da semana </h2>
            </div>
            <p className="mb-4 text-xs text-slate-500 dark:text-slate-400"> Adicione sessões para separar manhã, tarde e intervalos. Defina o início e o término de cada sessão. </p>
            <ScheduleEditor key={JSON.stringify(initialSessions)} initialSessions={initialSessions} />
          </div>
        </div>

        {/* Kolom Kanan: Date Overrides */}
        <div className="lg:col-span-2">
          <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900">
            <div className="mb-4 flex items-center gap-2">
              <svg className="h-5 w-5 text-amber-600 dark:text-amber-400" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 0 1 2.25-2.25h13.5A2.25 2.25 0 0 1 21 7.5v11.25m-18 0A2.25 2.25 0 0 0 5.25 21h13.5A2.25 2.25 0 0 0 21 18.75m-18 0v-7.5A2.25 2.25 0 0 1 5.25 9h13.5A2.25 2.25 0 0 1 21 11.25v7.5" />
              </svg>
              <h2 className="text-lg font-semibold text-slate-900 dark:text-white"> Feriados e bloqueios </h2>
            </div>
            <p className="mb-4 text-xs text-slate-500 dark:text-slate-400"> Bloqueie datas de feriados e folgas ou defina horários especiais. </p>
            <DateOverrideManager overrides={overrides} />
          </div>
        </div>
      </div>
    </div>
  );
}
