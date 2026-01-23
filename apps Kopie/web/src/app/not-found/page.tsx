export default function NotfoundPage() {
  return (
    <main className="max-w-3xl mx-auto px-4 py-16 space-y-8">
      <h1 className="text-3xl font-bold text-coral text-center">
        404 - Seite nicht gefunden
      </h1>
      <p className="text-gray-700 text-lg text-center">
        Die Seite, die du gesucht hast, gibt es nicht oder sie wurde verschoben.
      </p>
      <p className="text-center">
        <a className="text-coral underline" href="/">
          Zur Startseite
        </a>
      </p>
    </main>
  );
}
