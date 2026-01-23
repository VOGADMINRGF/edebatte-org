// apps/web/src/components/MembershipInfo.tsx
export default function MembershipInfo() {
  return (
    <section className="bg-coral/5 border-l-4 border-coral p-4 text-gray-700 rounded">
      <p className="font-semibold">Mitgliedschaften:</p>
      <ul className="list-disc list-inside space-y-1 mt-2">
        <li>
          <strong>10 €/Monat:</strong> Zugang zu exklusiven Reports
        </li>
        <li>
          <strong>50 €/Monat:</strong> Fördermitgliedschaft
        </li>
        <li>Jeder Beitrag hilft – freiwillig, kündbar, sinnvoll.</li>
      </ul>
    </section>
  );
}
