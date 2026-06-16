export interface KisTokenResponse {
  access_token: string;
  token_type: string;
  expires_in: number;
  expires_at?: number; // custom timestamp in ms
}

export interface KisQuoteResponse {
  output: {
    stck_prpr: string;      // 현재가 (current price)
    prdy_vrss: string;      // 전일 대비 (price change)
    prdy_ctrt: string;      // 전일 대비율 (change percentage)
    acml_vol: string;       // 누적 거래량 (accumulated volume)
    hts_kor_alph_usr_nm?: string; // 종목명 (korean name)
  } | null;
  rt_cd: string;
  msg_cd: string;
  msg1: string;
}

export interface KisDailyPriceItem {
  stck_bsop_date: string; // 영업 일자 (YYYYMMDD)
  stck_clpr: string;      // 종가 (close)
  stck_oprc: string;      // 시가 (open)
  stck_hgpr: string;      // 고가 (high)
  stck_lwpr: string;      // 저가 (low)
  acml_vol: string;       // 누적 거래량 (volume)
}

export interface KisDailyPriceResponse {
  output: KisDailyPriceItem[] | null;
  output1?: {
    hts_kor_alph_usr_nm: string; // 종목명 (korean name)
  };
  rt_cd: string;
  msg_cd: string;
  msg1: string;
}
