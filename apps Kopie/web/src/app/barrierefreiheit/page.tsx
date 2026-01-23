export default function BarrierefreiheitPage() {
  return (
    <main className="max-w-3xl mx-auto px-4 py-16 space-y-8">
      <h1 className="text-3xl font-bold text-coral text-center">
        Barrierefreiheit
      </h1>
      <div className="space-y-4 text-gray-700 text-lg text-center">
        <p>
          Wir möchten, dass eDebatte für alle Menschen gut nutzbar ist – auf
          dem Handy ebenso wie am Desktop.
        </p>
        <p>
          Wenn dir Barrieren auffallen, melde sie uns bitte über{" "}
          <a className="text-coral underline" href="/kontakt">
            /kontakt
          </a>
          . Wir prüfen jede Rückmeldung.
        </p>
      </div>
    </main>
  );
}
