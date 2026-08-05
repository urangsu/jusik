import { z } from "zod";

export const FinnhubQuoteSchema = z.object({
  c: z.number().finite(),
  d: z.number().nullable().optional(),
  dp: z.number().nullable().optional(),
  h: z.number().optional(),
  l: z.number().optional(),
  o: z.number().optional(),
  pc: z.number().optional(),
  t: z.number().optional(),
});

export const FinnhubCandleSchema = z.object({
  c: z.array(z.number()),
  h: z.array(z.number()),
  l: z.array(z.number()),
  o: z.array(z.number()),
  s: z.string(),
  t: z.array(z.number()),
  v: z.array(z.number()),
});
