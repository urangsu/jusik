import { NextRequest } from "next/server";
import { strategyTrialStore } from "@/server/strategy/strategy-trial-store";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const trial = await strategyTrialStore.getById(id);

    if (!trial) {
      return Response.json(
        { status: "not_found", message: `Trial '${id}' not found` },
        { status: 404 }
      );
    }

    return Response.json({ status: "cached", value: trial });
  } catch (err) {
    console.error("[strategy/trials/[id] GET]", err);
    return Response.json(
      { status: "error", message: "Failed to load strategy trial" },
      { status: 500 }
    );
  }
}
