// src/app/dashboard/layout.tsx
import Header from "@ui/layout/Header";
import Footer from "@ui/layout/Footer";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen flex flex-col bg-white">
      <Header />
      <main className="flex-1 container mx-auto px-6 py-10">{children}</main>
      <Footer />
    </div>
  );
}
