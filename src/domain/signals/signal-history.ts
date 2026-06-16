import { SignalVersion } from "./signal-version";

export type SignalHistoryRecord<TSignal> = SignalVersion & {
  signalHistoryId: string;
  assetId: string;
  date: string;
  signal: TSignal;
};
