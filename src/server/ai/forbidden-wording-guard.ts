const FORBIDDEN_TERMS_KO = [
  "강력 추천",
  "추천",
  "매수",
  "매도",
  "수익 보장",
  "확정 수익",
  "지금 사야",
  "진입 기회",
  "놓치면 안 됨",
  "급등 가능",
  "상승 확정",
  "하락 확정",
  "목표가 확정",
  "손절가 제시",
  "자동매매",
  "주문 실행",
];

const FORBIDDEN_TERMS_EN = [
  "strong buy",
  "strong sell",
  "guaranteed return",
  "guaranteed profit",
  "buy",
  "sell",
  "recommendation",
];

const EXCEPTIONS = [
  /매수\/매도 추천을 하지 않습니다/g,
  /투자 지시가 아닙니다/g,
  /투자 지시나 권유가 아닙니다/g,
  /투자 권유나 추천이 아닙니다/g,
  /운용 성과를 보장하지 않습니다/g,
  /종목 추천이 아닙니다/g,
  /not a buy or sell recommendation/gi,
  /not a buy or sell advice/gi,
  /not an investment recommendation/gi,
  /no buy or sell advice/gi,
  /원문 확인이 필요합니다/g,
];

export function inspectForbiddenWording(input: {
  text: string;
  locale?: "ko" | "en";
}): {
  blocked: boolean;
  blockedTerms: string[];
  reasons: string[];
} {
  const text = input.text;
  let cleanedText = text;

  // Replace exceptions first
  for (const regex of EXCEPTIONS) {
    cleanedText = cleanedText.replace(regex, "");
  }

  // Determine terms to check based on locale
  let termsToCheck: string[] = [];
  if (input.locale === "ko") {
    termsToCheck = FORBIDDEN_TERMS_KO;
  } else if (input.locale === "en") {
    termsToCheck = FORBIDDEN_TERMS_EN;
  } else {
    // Default: check both lists
    termsToCheck = [...FORBIDDEN_TERMS_KO, ...FORBIDDEN_TERMS_EN];
  }

  const blockedTerms: string[] = [];
  const lowerCleaned = cleanedText.toLowerCase();

  for (const term of termsToCheck) {
    const lowerTerm = term.toLowerCase();
    if (lowerCleaned.includes(lowerTerm)) {
      // Avoid duplicates
      if (!blockedTerms.includes(term)) {
        blockedTerms.push(term);
      }
    }
  }

  const blocked = blockedTerms.length > 0;
  const reasons = blocked
    ? [`금지 단어가 포함되어 있습니다: ${blockedTerms.join(", ")}`]
    : [];

  return {
    blocked,
    blockedTerms,
    reasons,
  };
}
