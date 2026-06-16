import { MarketBoardPage } from "@/components/market-board/MarketBoardPage";
import { loadMarketBoardSnapshot } from "@/server/snapshots/market-board-snapshot-loader";
import { getServerLocale } from "@/i18n/server-locale";
import { I18nProvider } from "@/i18n/use-i18n";

interface PageProps {
  searchParams: Promise<{ lang?: string }>;
}

export default async function Markets({ searchParams }: PageProps) {
  const resolvedParams = await searchParams;
  const locale = await getServerLocale(resolvedParams.lang);
  const initialSnapshot = await loadMarketBoardSnapshot("KOSPI_SAMPLE");

  return (
    <I18nProvider initialLocale={locale}>
      <main className="flex min-h-screen flex-col items-center justify-between w-full">
        <MarketBoardPage initialSnapshot={initialSnapshot} />
      </main>
    </I18nProvider>
  );
}
