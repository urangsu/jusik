import { DataStatus } from "../common/data-status";
import { UniverseConstituent } from "./universe-constituent";

export type MarketUniverseId = "KOSPI_SAMPLE" | "SP500_SAMPLE" | "KOSPI" | "SP500";

export type MarketUniverse = {
  id: MarketUniverseId;
  displayName: string;
  region: "KR" | "US";
  currency: "KRW" | "USD";
  constituents: UniverseConstituent[];
  source: string;
  sourceStatus: DataStatus;
  updatedAt: string | null;
};

export const KOSPI_SAMPLE_CONSTITUENTS: UniverseConstituent[] = [
  { assetId: "KR:005930", symbol: "005930", nameKo: "삼성전자", nameEn: "Samsung Electronics", sector: "정보기술", industry: "반도체 및 반도체 장비" },
  { assetId: "KR:000660", symbol: "000660", nameKo: "SK하이닉스", nameEn: "SK Hynix", sector: "정보기술", industry: "반도체 및 반도체 장비" },
  { assetId: "KR:373220", symbol: "373220", nameKo: "LG에너지솔루션", nameEn: "LG Energy Solution", sector: "정보기술", industry: "전기제품" },
  { assetId: "KR:207940", symbol: "207940", nameKo: "삼성바이오로직스", nameEn: "Samsung Biologics", sector: "헬스케어", industry: "제약 및 바이오" },
  { assetId: "KR:005380", symbol: "005380", nameKo: "현대차", nameEn: "Hyundai Motor", sector: "경기소비재", industry: "자동차" },
  { assetId: "KR:068270", symbol: "068270", nameKo: "셀트리온", nameEn: "Celltrion", sector: "헬스케어", industry: "제약 및 바이오" },
  { assetId: "KR:005490", symbol: "005490", nameKo: "POSCO홀딩스", nameEn: "POSCO Holdings", sector: "소재", industry: "철강 및 금속" },
  { assetId: "KR:051910", symbol: "051910", nameKo: "LG화학", nameEn: "LG Chem", sector: "소재", industry: "화학" },
  { assetId: "KR:035420", symbol: "035420", nameKo: "NAVER", nameEn: "NAVER", sector: "커뮤니케이션 서비스", industry: "인터넷 소프트웨어 및 서비스" },
  { assetId: "KR:000270", symbol: "000270", nameKo: "기아", nameEn: "Kia", sector: "경기소비재", industry: "자동차" },
  { assetId: "KR:006400", symbol: "006400", nameKo: "삼성SDI", nameEn: "Samsung SDI", sector: "정보기술", industry: "전자 장비 및 기기" },
  { assetId: "KR:035720", symbol: "035720", nameKo: "카카오", nameEn: "Kakao", sector: "커뮤니케이션 서비스", industry: "인터넷 소프트웨어 및 서비스" },
  { assetId: "KR:105560", symbol: "105560", nameKo: "KB금융", nameEn: "KB Financial Group", sector: "금융", industry: "은행" },
  { assetId: "KR:055550", symbol: "055550", nameKo: "신한지주", nameEn: "Shinhan Financial Group", sector: "금융", industry: "은행" },
  { assetId: "KR:003550", symbol: "003550", nameKo: "LG", nameEn: "LG Corp", sector: "산업재", industry: "복합기업" },
  { assetId: "KR:012330", symbol: "012330", nameKo: "현대모비스", nameEn: "Hyundai Mobis", sector: "경기소비재", industry: "자동차 부품" },
  { assetId: "KR:066570", symbol: "066570", nameKo: "LG전자", nameEn: "LG Electronics", sector: "정보기술", industry: "가전제품" },
  { assetId: "KR:096770", symbol: "096770", nameKo: "SK이노베이션", nameEn: "SK Innovation", sector: "에너지", industry: "석유 및 가스" },
  { assetId: "KR:000810", symbol: "000810", nameKo: "삼성화재", nameEn: "Samsung Fire & Marine", sector: "금융", industry: "보험" },
  { assetId: "KR:086790", symbol: "086790", nameKo: "하나금융지주", nameEn: "Hana Financial Group", sector: "금융", industry: "은행" }
];

export const SP500_SAMPLE_CONSTITUENTS: UniverseConstituent[] = [
  { assetId: "US:AAPL", symbol: "AAPL", nameKo: "애플", nameEn: "Apple", sector: "Information Technology", industry: "Technology Hardware" },
  { assetId: "US:MSFT", symbol: "MSFT", nameKo: "마이크로소프트", nameEn: "Microsoft", sector: "Information Technology", industry: "Software" },
  { assetId: "US:NVDA", symbol: "NVDA", nameKo: "엔비디아", nameEn: "NVIDIA", sector: "Information Technology", industry: "Semiconductors" },
  { assetId: "US:AMZN", symbol: "AMZN", nameKo: "아마존", nameEn: "Amazon", sector: "Consumer Discretionary", industry: "Broadline Retail" },
  { assetId: "US:GOOGL", symbol: "GOOGL", nameKo: "알파벳", nameEn: "Alphabet", sector: "Communication Services", industry: "Interactive Media" },
  { assetId: "US:META", symbol: "META", nameKo: "메타", nameEn: "Meta Platforms", sector: "Communication Services", industry: "Interactive Media" },
  { assetId: "US:BRK.B", symbol: "BRK.B", nameKo: "버크셔 해서웨이", nameEn: "Berkshire Hathaway", sector: "Financials", industry: "Multi-Sector Holdings" },
  { assetId: "US:TSLA", symbol: "TSLA", nameKo: "테슬라", nameEn: "Tesla", sector: "Consumer Discretionary", industry: "Automobiles" },
  { assetId: "US:LLY", symbol: "LLY", nameKo: "일라이 릴리", nameEn: "Eli Lilly", sector: "Health Care", industry: "Pharmaceuticals" },
  { assetId: "US:AVGO", symbol: "AVGO", nameKo: "브로드컴", nameEn: "Broadcom", sector: "Information Technology", industry: "Semiconductors" },
  { assetId: "US:JPM", symbol: "JPM", nameKo: "JP모건 체이스", nameEn: "JPMorgan Chase", sector: "Financials", industry: "Banks" },
  { assetId: "US:UNH", symbol: "UNH", nameKo: "유나이티드헬스", nameEn: "UnitedHealth Group", sector: "Health Care", industry: "Healthcare Providers" },
  { assetId: "US:XOM", symbol: "XOM", nameKo: "엑손모빌", nameEn: "Exxon Mobil", sector: "Energy", industry: "Oil & Gas" },
  { assetId: "US:V", symbol: "V", nameKo: "비자", nameEn: "Visa", sector: "Financials", industry: "Financial Services" },
  { assetId: "US:PG", symbol: "PG", nameKo: "프록터 앤 갬블", nameEn: "Procter & Gamble", sector: "Consumer Staples", industry: "Household Products" },
  { assetId: "US:COST", symbol: "COST", nameKo: "코스트코", nameEn: "Costco Wholesale", sector: "Consumer Staples", industry: "Consumer Staples Retail" },
  { assetId: "US:JNJ", symbol: "JNJ", nameKo: "존슨 앤 존슨", nameEn: "Johnson & Johnson", sector: "Health Care", industry: "Pharmaceuticals" },
  { assetId: "US:MA", symbol: "MA", nameKo: "마스터카드", nameEn: "Mastercard", sector: "Financials", industry: "Financial Services" },
  { assetId: "US:HD", symbol: "HD", nameKo: "홈디포", nameEn: "Home Depot", sector: "Consumer Discretionary", industry: "Specialty Retail" },
  { assetId: "US:MRK", symbol: "MRK", nameKo: "머크", nameEn: "Merck & Co", sector: "Health Care", industry: "Pharmaceuticals" }
];

export const KOSPI_SAMPLE_UNIVERSE: MarketUniverse = {
  id: "KOSPI_SAMPLE",
  displayName: "코스피 대표",
  region: "KR",
  currency: "KRW",
  constituents: KOSPI_SAMPLE_CONSTITUENTS,
  source: "KRX Manual Import",
  sourceStatus: "cached",
  updatedAt: new Date().toISOString()
};

export const SP500_SAMPLE_UNIVERSE: MarketUniverse = {
  id: "SP500_SAMPLE",
  displayName: "S&P 500 대표",
  region: "US",
  currency: "USD",
  constituents: SP500_SAMPLE_CONSTITUENTS,
  source: "S&P Indices manual config",
  sourceStatus: "cached",
  updatedAt: new Date().toISOString()
};
