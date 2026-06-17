export type OpenDartCorpCodeRecord = {
  corpCode: string;       // 8자리
  corpName: string;
  stockCode: string | null; // 상장사 6자리, 기타 null 가능
  modifyDate: string | null;

  source: "OpenDART";
  sourceTier: "official";
  updatedAt: string;
};
