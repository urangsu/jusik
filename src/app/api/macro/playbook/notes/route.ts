import { NextRequest } from "next/server";
import { macroPlaybookStore } from "@/server/macro/macro-playbook-store";
import { checkSettingsWriteEnabled } from "@/server/security/settings-write-guard";
import { createSafeResponse } from "@/server/security/safe-api-response";
import { DataEnvelope } from "@/domain/common/data-status";
import { MacroViewNote } from "@/domain/macro/macro-view-note";

export async function POST(request: NextRequest) {
  const guard = checkSettingsWriteEnabled({ routeName: "macro/playbook/notes" });
  if (guard) return guard;

  try {
    const body = await request.json();

    if (body.action === "update_status") {
      const { noteId, status } = body;
      if (!noteId || !["draft", "reviewed", "rejected"].includes(status)) {
        return Response.json({ status: "error", message: "Invalid parameters" }, { status: 400 });
      }
      const updated = await macroPlaybookStore.updateNoteStatus(noteId, status);
      if (!updated) {
        return Response.json({ status: "error", message: "Note not found" }, { status: 404 });
      }

      const envelope: DataEnvelope<typeof updated> = {
        value: updated,
        status: "cached",
        source: "Macro Playbook Store",
        sourceTier: "manual_import",
        warnings: [],
        updatedAt: new Date().toISOString(),
      };
      return createSafeResponse(envelope);
    }

    const note: MacroViewNote = {
      id: body.id || `note-${Math.random().toString(36).substr(2, 9)}`,
      sourceType: body.sourceType || "manual_note",
      sourceUrl: body.sourceUrl || null,
      sourceTitle: body.sourceTitle || null,
      authorName: body.authorName || null,
      thesisKo: body.thesisKo || "",
      keyVariables: body.keyVariables || [],
      regimeImplication: body.regimeImplication || "unclear",
      userReviewStatus: body.userReviewStatus || "draft",
      userMemo: body.userMemo || null,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    await macroPlaybookStore.addNote(note);

    const envelope: DataEnvelope<typeof note> = {
      value: note,
      status: "cached",
      source: "Macro Playbook Store",
      sourceTier: "manual_import",
      warnings: [],
      updatedAt: new Date().toISOString(),
    };

    return createSafeResponse(envelope);
  } catch (err: any) {
    const envelope: DataEnvelope<null> = {
      value: null,
      status: "error",
      source: "Macro Playbook Store",
      sourceTier: "manual_import",
      warnings: [],
      updatedAt: null,
      message: err?.message || String(err),
    };
    return createSafeResponse(envelope, 500);
  }
}
