import { ReliabilityWorkspace } from "@/components/reliability/ReliabilityWorkspace";
import { getServerLocale } from "@/i18n/server-locale";
import { I18nProvider } from "@/i18n/use-i18n";

interface PageProps {
  searchParams: Promise<{ lang?: string }>;
}

export default async function Reliability({ searchParams }: PageProps) {
  const resolvedParams = await searchParams;
  const locale = await getServerLocale(resolvedParams.lang);

  return (
    <I18nProvider initialLocale={locale}>
      <main className="flex min-h-screen flex-col items-center justify-between w-full bg-kt-bg-body text-kt-text-primary">
        <div className="w-full">
          <ReliabilityWorkspace />
        </div>
      </main>
    </I18nProvider>
  );
}

export const dynamic = "force-dynamic";
