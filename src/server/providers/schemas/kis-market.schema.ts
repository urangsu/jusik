import { z } from "zod";

export const KisQuoteSchema = z.object({
  stck_prpr: z.string().refine((val) => !isNaN(parseFloat(val)), { message: "Invalid stck_prpr" }),
  prdy_vrss: z.string().refine((val) => !isNaN(parseFloat(val)), { message: "Invalid prdy_vrss" }),
  prdy_ctrt: z.string().refine((val) => !isNaN(parseFloat(val)), { message: "Invalid prdy_ctrt" }),
  acml_vol: z.string().refine((val) => !isNaN(parseInt(val, 10)), { message: "Invalid acml_vol" }),
});

export const KisDailyItemSchema = z.object({
  stck_bsop_date: z.string().length(8),
  stck_oprc: z.string().refine((val) => !isNaN(parseFloat(val)), { message: "Invalid stck_oprc" }),
  stck_hgpr: z.string().refine((val) => !isNaN(parseFloat(val)), { message: "Invalid stck_hgpr" }),
  stck_lwpr: z.string().refine((val) => !isNaN(parseFloat(val)), { message: "Invalid stck_lwpr" }),
  stck_clpr: z.string().refine((val) => !isNaN(parseFloat(val)), { message: "Invalid stck_clpr" }),
  acml_vol: z.string().refine((val) => !isNaN(parseInt(val, 10)), { message: "Invalid acml_vol" }),
});
