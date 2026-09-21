import UnsubscribeClient from "./UnsubscribeClient";

type Props = {
  searchParams?: Promise<Record<string, string | string[] | undefined>> | Record<string, string | string[] | undefined>;
};

export const metadata = {
  title: "Updates abbestellen · eDebatte",
};

function first(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] ?? "" : value ?? "";
}

export default async function UnsubscribePage({ searchParams }: Props) {
  const params = await Promise.resolve(searchParams ?? {});
  const token = first(params.token);

  return (
    <main className="min-h-screen bg-[rgb(var(--bg))] px-4 py-10">
      <div className="mx-auto max-w-xl rounded-3xl border border-[rgb(var(--border))] bg-[rgb(var(--card))] p-6 shadow-sm md:p-8">
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-sky-500">eDebatte Updates</p>
        <h1 className="mt-2 text-2xl font-semibold text-[rgb(var(--fg))]">Updates abbestellen</h1>
        <p className="mt-2 text-sm text-[rgb(var(--muted))]">
          Aus Sicherheitsgründen wird eine Abmeldung erst nach deiner ausdrücklichen Bestätigung gespeichert. Ein Mail-Scanner oder Link-Preview kann dich nicht allein durch das Öffnen dieses Links abmelden.
        </p>
        <div className="mt-6">
          <UnsubscribeClient token={token} />
        </div>
      </div>
    </main>
  );
}
