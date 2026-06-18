import { MacroViewNote } from "@/domain/macro/macro-view-note";
import { JsonFileStore } from "../storage/json-file-store";

export class MacroPlaybookStore {
  private notesStore: JsonFileStore<MacroViewNote[]>;

  constructor() {
    this.notesStore = new JsonFileStore<MacroViewNote[]>(
      "data/macro/notes.json",
      []
    );
  }

  async getNotes(): Promise<MacroViewNote[]> {
    return this.notesStore.read();
  }

  async addNote(note: MacroViewNote): Promise<void> {
    const notes = await this.notesStore.read();
    notes.push(note);
    await this.notesStore.write(notes);
  }

  async updateNoteStatus(noteId: string, status: "draft" | "reviewed" | "rejected"): Promise<MacroViewNote | null> {
    const notes = await this.notesStore.read();
    const note = notes.find((n) => n.id === noteId);
    if (!note) return null;
    note.userReviewStatus = status;
    note.updatedAt = new Date().toISOString();
    await this.notesStore.write(notes);
    return note;
  }
}

export const macroPlaybookStore = new MacroPlaybookStore();
