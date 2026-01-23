type StepId = 1 | 2 | 3;

const STEPS: { id: StepId; title: string; subtitle: string }[] = [
  { id: 1, title: "Konto", subtitle: "Basisdaten anlegen" },
  { id: 2, title: "E-Mail", subtitle: "Adresse bestätigen" },
  { id: 3, title: "OTP", subtitle: "OTP prüfen" },
];

export function RegisterStepper({ current }: { current: StepId }) {
  return (
    <ol className="flex flex-col gap-2 rounded-2xl bg-white/80 p-3 shadow-sm ring-1 ring-slate-200 md:flex-row md:gap-3">
      {STEPS.map((step) => {
        const isActive = step.id === current;
        const isDone = step.id < current;

        return (
          <li
            key={step.id}
            className="flex flex-1 items-center gap-3 rounded-xl px-3 py-2"
          >
            <div
              className={[
                "flex h-7 w-7 items-center justify-center rounded-full text-xs font-semibold",
                isActive
                  ? "bg-gradient-to-r from-sky-500 to-emerald-500 text-white shadow"
                  : isDone
                    ? "bg-emerald-50 text-emerald-800 ring-1 ring-emerald-200"
                    : "bg-slate-100 text-slate-500",
              ].join(" ")}
              aria-hidden
            >
              {step.id}
            </div>
            <div className="min-w-0">
              <p
                className={[
                  "text-xs font-semibold",
                  isActive
                    ? "text-slate-900"
                    : isDone
                      ? "text-emerald-800"
                      : "text-slate-500",
                ].join(" ")}
              >
                SCHRITT {step.id} / 3 · {step.title}
              </p>
              <p className="truncate text-[11px] text-slate-500">
                {step.subtitle}
              </p>
            </div>
          </li>
        );
      })}
    </ol>
  );
}
