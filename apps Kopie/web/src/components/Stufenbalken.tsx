export function Stufenbalken({ steps = [], active = 0 }) {
  return (
    <div className="flex items-center gap-2 my-8">
      {steps.map((step, idx) => (
        <div key={step} className="flex items-center">
          <div
            className={`w-8 h-8 rounded-full flex items-center justify-center font-bold
                ${idx <= active ? "bg-coral text-white" : "bg-gray-200 text-gray-400"}
              `}
          >
            {idx + 1}
          </div>
          {idx < steps.length - 1 && (
            <div className="w-8 h-1 bg-gray-300"></div>
          )}
        </div>
      ))}
      <div className="ml-4 font-semibold">{steps[active]}</div>
    </div>
  );
}

// Beispiel-Aufruf:
// <Stufenbalken steps={["Anliegen", "Abstimmen", "Auswertung", "Politik"]} active={2} />
