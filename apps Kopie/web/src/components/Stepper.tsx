/* @ts-nocheck */
export default function Stepper({ step }: { step:number }) {
    const items = ["Text", "Analyse", "Bestätigung", "Faktencheck", "Fertig"];
    return (
      <div className="flex flex-wrap gap-2 mb-4">
        {items.map((label, idx) => {
          const active = step === idx;
          return (
            <div key={label}
                 className={`px-3 py-1 rounded-full border text-sm ${active ? "bg-black text-white" : "bg-white"}`}>
              {label}
            </div>
          );
        })}
      </div>
    );
  }
  