export type WatchlistEventType =
  | "added"
  | "removed"
  | "updated";

export type WatchlistEvent = {
  id: string;
  assetId: string;
  type: WatchlistEventType;
  payload: Record<string, any>;
  createdAt: string;
};
