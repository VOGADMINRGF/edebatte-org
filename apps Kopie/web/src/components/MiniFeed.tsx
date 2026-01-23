export function MiniFeed({ items }: { items: any[] }) {
  return (
    <ul className="space-y-3 my-6">
      {items.map((item: any, idx: number) => (
        <li
          key={idx}
          className="bg-gray-50 rounded-lg p-4 flex gap-3 items-start shadow"
        >
          <span className="text-2xl">{item.icon || "💬"}</span>
          <div>
            <div className="font-semibold">{item.author || "User"}</div>
            <div className="text-gray-700 text-sm">{item.text}</div>
          </div>
        </li>
      ))}
    </ul>
  );
}

// Beispiel-Aufruf:
// <MiniFeed items={[
//   { icon: "🧑‍💼", author: "Anna", text: "Endlich kann ich mitreden, super!" },
//   { icon: "👨‍💻", author: "Ben", text: "Die Auswertung ist genial transparent." }
// ]} />
