import { AiOutputIntent, AiContextPack } from "@/domain/ai/structured-ai-output";
import { AiPromptInput } from "@/domain/ai/ai-prompt-input";

const FORBIDDEN_ACTIONS_KO = [
  "매수, 매도, 추천, 강력 추천, 수익 보장, 확정 수익 등의 단어와 투자 권유 표현을 사용하는 행위 금지",
  "제공된 contextPack 외에 존재하지 않는 사실(임의 가격, 비율, 지표)을 날조하여 추가하는 행위 금지",
  "정규화된 출처(sourceRef) 정보가 유효하지 않거나 누락된 설명(claim)을 작성하는 행위 금지",
  "특정 매매가 진입 기회, 손절가, 목표가 등을 제시하여 직접적인 투자 지시를 내리는 행위 금지",
  "실거래 주문 실행, 모의 투자 연동, 또는 외부 Telegram/이메일 알림 연동에 관한 유도 행위 금지",
];

const FORBIDDEN_ACTIONS_EN = [
  "Forbidden to use words like buy, sell, strong buy, strong sell, recommendation, or guaranteed return/profit",
  "Forbidden to invent facts (prices, ratios, target prices) not present in the provided contextPack",
  "Forbidden to write claims that do not possess a valid source reference in the contextPack",
  "Forbidden to issue buy/sell instructions, stop-loss targets, or price targets",
  "Forbidden to integrate with live trading, paper trading, or external push notification channels",
];

const REQUIRED_DISCLAIMERS_KO: Record<string, string> = {
  audit_finding_explanation: "본 내용은 감사 Finding의 진단 설명이며 투자 지시가 아닙니다.",
  strategy_trial_explanation: "본 내용은 백테스트 및 전략 시도 기록의 설명이며 운용 성과를 보장하지 않습니다.",
  signal_reliability_explanation: "본 내용은 신호 신뢰도 진단이며 종목 추천이 아닙니다.",
  filing_explanation: "본 내용은 공시 요약 보조 설명이며 원문 확인이 필요합니다.",
};

const REQUIRED_DISCLAIMERS_EN: Record<string, string> = {
  audit_finding_explanation:
    "This content is a diagnostic explanation of the audit finding and is not an investment instruction.",
  strategy_trial_explanation:
    "This content is an explanation of backtest and strategy trial records and does not guarantee investment performance.",
  signal_reliability_explanation:
    "This content is a signal reliability diagnosis and is not a stock recommendation.",
  filing_explanation:
    "This content is an auxiliary summary explanation of the disclosure filing and requires verification of the original source.",
};

export function buildAiPromptInputFromContextPack(input: {
  contextPack: AiContextPack;
  intent: AiOutputIntent;
  locale?: "ko" | "en";
  userInstruction?: string | null;
}): AiPromptInput {
  const lang = input.locale || "ko";
  const forbiddenActions = lang === "ko" ? FORBIDDEN_ACTIONS_KO : FORBIDDEN_ACTIONS_EN;

  const requiredDisclaimers: string[] = [];
  const disclaimersMap = lang === "ko" ? REQUIRED_DISCLAIMERS_KO : REQUIRED_DISCLAIMERS_EN;
  const disclaimerVal = disclaimersMap[input.intent];
  if (disclaimerVal) {
    requiredDisclaimers.push(disclaimerVal);
  }

  const allowedClaimSourceIds = input.contextPack.sourceRefs.map((ref) => ref.sourceId);

  return {
    id: `prompt_input_${input.contextPack.id}_${Date.now()}`,
    intent: input.intent,
    systemPolicy: {
      language: lang,
      forbiddenActions,
      requiredDisclaimers,
      outputFormat: "structured_json_only",
    },
    contextPack: input.contextPack,
    userInstruction: input.userInstruction || null,
    allowedClaimSourceIds,
    requiredOutputSchema: "StructuredAiOutput",
    createdAt: new Date().toISOString(),
  };
}
