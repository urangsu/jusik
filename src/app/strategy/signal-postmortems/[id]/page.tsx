import { getSignalPostmortemById } from "@/server/strategy/signal-postmortem-store";
import { SignalPostmortemDetail } from "@/components/strategy/SignalPostmortemDetail";
import { getServerLocale } from "@/i18n/server-locale";
import { I18nProvider } from "@/i18n/use-i18n";
import { notFound } from "next/navigation";

interface PageProps {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ lang?: string }>;
}

export default async function Page({ params, searchParams }: PageProps) {
  const { id } = await params;
  const resolvedSearchParams = await searchParams;
  const postmortem = await getSignalPostmortemById(id);

  if (!postmortem) {
    notFound();
  }

  const locale = await getServerLocale(resolvedSearchParams.lang);

  return (
    <I18nProvider initialLocale={locale}>
      <main className="flex min-h-screen flex-col items-center justify-between w-full bg-kt-bg-body text-kt-text-primary">
        <SignalPostmortemDetail postmortem={postmortem} />
      </main>
    </I18nProvider>
  );
}
