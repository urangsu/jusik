export type SignalPostmortemEventType =
  | "created"
  | "reviewed"
  | "ignored"
  | "notes_updated";

export type SignalPostmortemEvent = {
  id: string;
  postmortemId: string;
  type: SignalPostmortemEventType;
  payload: Record<string, unknown>;
  createdAt: string;
};
