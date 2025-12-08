import { notFound } from "next/navigation";
import { locales } from "../../../i18n";
import { Header, Footer } from "@vog/ui";
import { LocaleProvider } from "@/context/LocaleContext"; // <-- dein eigener Kontextprovider

export default async function LocaleLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ locale?: string | string[] }>;
}) {
  const { locale } = await params;
  const localeValue = typeof locale === "string" ? locale : Array.isArray(locale) ? locale[0] : undefined;

  if (!localeValue || !locales.includes(localeValue as any)) notFound();

  return (
    <html lang={localeValue}>
      <body>
        <LocaleProvider initialLocale={localeValue as any}>
          <Header />
          {children}
          <Footer />
        </LocaleProvider>
      </body>
    </html>
  );
}
