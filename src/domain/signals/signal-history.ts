import { SignalVersion } from "./signal-version";

export type SignalHistoryRecord<TSignal> = {
  signalHistoryId: string;
  assetId: string;
  date: string;
  version: SignalVersion;
  signal: TSignal;
};
