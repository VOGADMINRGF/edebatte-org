// Beispiel: apps/web/src/components/StatementPyramide.tsx
export function StatementPyramide() {
    return (
      <div className="grid grid-cols-[1.1fr_1.2fr_1fr] gap-5">
        {/* Spalte 1 – Hauptthemen */}
        <section className="card">
          <header className="card-header">Hauptthemen</header>
          <div className="p-4 space-y-2">
            <span className="pill">Landwirtschaft</span>
            <span className="pill">Sicherheit</span>
            <span className="pill">Digitales</span>
          </div>
        </section>
  
        {/* Spalte 2 – Aussage + Optionen */}
        <section className="card">
          <header className="card-header">Hauptaussage & Optionen</header>
          <div className="p-4 space-y-3">
            <h3 className="text-lg font-semibold">
              Soll Stufe 4 als Mindeststandard umgesetzt werden?
            </h3>
            <div className="grid sm:grid-cols-2 gap-2">
              <button className="pill">Option A: sofort</button>
              <button className="pill">Option B: gestaffelt</button>
            </div>
          </div>
        </section>
  
        {/* Spalte 3 – Argumente */}
        <section className="card">
          <header className="card-header">Argumente</header>
          <div className="p-4 space-y-3">
            <div>
              <div className="pill mb-1">Pro</div>
              <p className="text-sm text-gray-700">
                Tierschutz verbessert sich messbar (Quelle XY).
              </p>
            </div>
            <div>
              <div className="pill mb-1">Contra</div>
              <p className="text-sm text-gray-700">
                Kostensteigerung für Betriebe (Studie ABC).
              </p>
            </div>
          </div>
        </section>
      </div>
    );
  }
  