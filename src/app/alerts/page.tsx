import { AlertSettingsPage } from "@/components/alerts/AlertSettingsPage";
import { getServerLocale } from "@/i18n/server-locale";
import { I18nProvider } from "@/i18n/use-i18n";

interface PageProps {
  searchParams: Promise<{ lang?: string }>;
}

export default async function Alerts({ searchParams }: PageProps) {
  const resolvedParams = await searchParams;
  const locale = await getServerLocale(resolvedParams.lang);

  return (
    <I18nProvider initialLocale={locale}>
      <main className="flex min-h-screen flex-col items-center justify-between w-full">
        <AlertSettingsPage />
      </main>
    </I18nProvider>
  );
}
