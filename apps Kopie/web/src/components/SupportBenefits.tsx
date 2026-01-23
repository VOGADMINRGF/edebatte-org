// apps/web/src/components/SupportBenefits.tsx
export default function SupportBenefits() {
  return (
    <section className="bg-gray-50 border border-gray-200 rounded-lg p-6 space-y-4">
      <p className="text-gray-700 font-medium">
        Mit deinem Beitrag unterstützt du konkret:
      </p>
      <ul className="list-disc list-inside text-gray-700 space-y-1">
        <li>Barrierefreie & sichere Plattformentwicklung</li>
        <li>Redaktionelle Aufbereitung & Moderation</li>
        <li>Unabhängige Infrastruktur (ohne Werbung)</li>
      </ul>
    </section>
  );
}
