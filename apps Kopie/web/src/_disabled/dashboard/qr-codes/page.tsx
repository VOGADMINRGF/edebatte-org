import useSWR from "swr";

export default function QRCodeDashboard() {
  const { data, error } = useSWR("/api/qr/list", fetcher);

  if (error) return <div>Fehler beim Laden</div>;
  if (!data) return <div>Lädt...</div>;

  return (
    <main className="max-w-4xl mx-auto py-10">
      <h2 className="text-2xl font-bold mb-8">QR-Code Übersicht</h2>
      <table className="w-full table-auto border-collapse">
        <thead>
          <tr>
            <th>Zieltyp</th>
            <th>Titel</th>
            <th>ID(s)</th>
            <th>Owner</th>
            <th>Premium</th>
            <th>Erstellt am</th>
          </tr>
        </thead>
        <tbody>
          {data.data.map((qr) => (
            <tr key={qr._id} className="border-t">
              <td>{qr.targetType}</td>
              <td>{qr.title || "-"}</td>
              <td>{qr.targetIds.join(", ")}</td>
              <td>{qr.ownerId}</td>
              <td>{qr.isPremium ? "Ja" : "Nein"}</td>
              <td>{new Date(qr.createdAt).toLocaleString()}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </main>
  );
}
