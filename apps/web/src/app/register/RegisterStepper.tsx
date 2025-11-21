const STEPS = [
  { id: 1, title: "Konto", description: "Basisdaten anlegen" },
  { id: 2, title: "E-Mail", description: "Adresse bestätigen" },
  { id: 3, title: "Identität", description: "OTB/eID (Mock) prüfen" },
];

export function RegisterStepper({ current }: { current: number }) {
  return (
    <ol className="mb-6 grid gap-3 rounded-3xl border border-slate-100 bg-white/80 p-4 text-sm text-slate-600 shadow-sm sm:grid-cols-3">
      {STEPS.map((step) => {
        const active = step.id === current;
        const done = step.id < current;
        return (
          <li
            key={step.id}
            className={[
              "flex flex-col rounded-2xl border px-4 py-3",
              done
                ? "border-emerald-200 bg-emerald-50"
                : active
                ? "border-slate-900 bg-slate-900/5"
                : "border-slate-200 bg-white",
            ].join(" ")}
          >
            <div className="flex items-center gap-2">
              <span
                className={`flex h-7 w-7 items-center justify-center rounded-full text-xs font-semibold ${
                  done
                    ? "bg-emerald-500 text-white"
                    : active
                    ? "bg-slate-900 text-white"
                    : "bg-slate-200 text-slate-600"
                }`}
                aria-hidden
              >
                {step.id}
              </span>
              <div>
                <p className={`text-xs uppercase tracking-wide ${active ? "text-slate-900" : "text-slate-500"}`}>
                  Schritt {step.id} / {STEPS.length}
                </p>
                <p className={`text-base font-semibold ${active ? "text-slate-900" : done ? "text-emerald-700" : ""}`}>
                  {step.title}
                </p>
              </div>
            </div>
            <p className="mt-2 text-xs text-slate-500">{step.description}</p>
          </li>
        );
      })}
    </ol>
  );
}
