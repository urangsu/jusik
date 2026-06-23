import { FilingDetail } from "@/components/filings/FilingDetail";
import { getServerLocale } from "@/i18n/server-locale";
import { I18nProvider } from "@/i18n/use-i18n";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";

interface PageProps {
  searchParams: Promise<{ assetId?: string; filingId?: string; lang?: string }>;
}

export default async function FilingsPage({ searchParams }: PageProps) {
  const resolvedSearchParams = await searchParams;
  const filingId = resolvedSearchParams.filingId;
  const locale = await getServerLocale(resolvedSearchParams.lang);

  return (
    <I18nProvider initialLocale={locale}>
      <main className="flex min-h-screen flex-col items-center justify-between w-full bg-kt-bg-body text-kt-text-primary">
        {filingId ? (
          <FilingDetail receiptNo={filingId} />
        ) : (
          <div className="w-full max-w-xl mx-auto p-12 text-center space-y-4">
            <div className="p-4 bg-kt-bg-surface-100 border border-kt-border-panel rounded-kt-card text-xs text-kt-text-secondary">
              {locale === "ko" 
                ? "조회할 공시 ID(접수번호)가 지정되지 않았습니다." 
                : "No filing ID (receipt number) specified to view."}
            </div>
            <Link
              href="/watchlist"
              className="inline-flex items-center gap-2 text-xs text-kt-text-secondary hover:text-kt-text-primary transition-colors px-3 py-1.5 rounded-kt-pill bg-kt-bg-surface-100 border border-kt-border-panel cursor-pointer"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>{locale === "ko" ? "인박스로 돌아가기" : "Back to Inbox"}</span>
            </Link>
          </div>
        )}
      </main>
    </I18nProvider>
  );
}
