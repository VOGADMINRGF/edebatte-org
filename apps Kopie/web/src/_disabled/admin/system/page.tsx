// apps/web/src/app/admin/system/page.tsx
import SystemMatrix from "@features/dashboard/components/SystemMatrix";
import StreamsPanel from "@features/dashboard/components/StreamsPanel";

export default function AdminSystemPage() {
  return (
    <main className="p-6 space-y-6">
      <h1 className="text-xl font-semibold">Systemstatus</h1>
      <SystemMatrix />
      <StreamsPanel />
    </main>
  );
}
