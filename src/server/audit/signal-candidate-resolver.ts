export type SignalAuditCandidate = {
  signalId: string;
  signalLabelKo: string | null;
  currentWeightInMomentumV1: number | null;
  available: boolean;
  unavailableReason: string | null;
};

const MOMENTUM_V1_WEIGHTS: Record<string, number> = {
  momentum_return: 0.20,
  momentum_ma_slope: 0.15,
  momentum_weinstein: 0.15,
  momentum_ichimoku: 0.15,
  momentum_turtle: 0.10,
  momentum_darvas: 0.10,
  momentum_volatility: 0.075,
  momentum_volume: 0.075,
};

const SIGNAL_LABELS: Record<string, string> = {
  momentum_return: "수익률 모멘텀",
  momentum_ma_slope: "이동평균 기울기 모멘텀",
  momentum_weinstein: "와인스타인 스테이지 모멘텀",
  momentum_ichimoku: "일목균형표 모멘텀",
  momentum_turtle: "터틀 채널 돌파 모멘텀",
  momentum_darvas: "다윈 박스 돌파 모멘텀",
  momentum_volatility: "변동성 Z-Score 모멘텀",
  momentum_volume: "거래량 Z-Score 모멘텀",
};

const UNAVAILABLE_CANDIDATES: { id: string; label: string }[] = [
  { id: "return_20d", label: "20일 수익률" },
  { id: "return_60d", label: "60일 수익률" },
  { id: "volume_zscore_60", label: "60일 거래량 Z-Score" },
  { id: "ichimoku_cloud_position", label: "일목균형표 구름대 위치" },
  { id: "ichimoku_tk_cross", label: "일목균형표 TK 크로스" },
  { id: "darvas_box_breakout", label: "다윈 박스 돌파" },
  { id: "turtle_channel_breakout", label: "터틀 채널 돌파" },
  { id: "weinstein_stage", label: "와인스타인 스테이지" },
];

export async function resolveSignalAuditCandidates(input: {
  universeId: "KOSPI_SAMPLE" | "SP500_SAMPLE";
}): Promise<SignalAuditCandidate[]> {
  const candidates: SignalAuditCandidate[] = [];

  // Active (available) signals from momentum_v1
  for (const [signalId, weight] of Object.entries(MOMENTUM_V1_WEIGHTS)) {
    candidates.push({
      signalId,
      signalLabelKo: SIGNAL_LABELS[signalId] || null,
      currentWeightInMomentumV1: weight,
      available: true,
      unavailableReason: null,
    });
  }

  // Unavailable raw sub-components
  for (const item of UNAVAILABLE_CANDIDATES) {
    candidates.push({
      signalId: item.id,
      signalLabelKo: item.label,
      currentWeightInMomentumV1: null,
      available: false,
      unavailableReason: "momentum_v1의 독립적인 atomic signal로 구성되지 않음",
    });
  }

  return candidates;
}
