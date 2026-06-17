import { NextRequest } from "next/server";
import { createSafeResponse } from "../../../../../../../server/security/safe-api-response";
import { deleteProviderSecret } from "../../../../../../../server/settings/provider-secret-store";
import { getProviderSettings, updateProviderStatus } from "../../../../../../../server/settings/provider-settings-store";
import { checkSettingsWriteEnabled } from "../../../../../../../server/security/settings-write-guard";
import { ProviderId } from "../../../../../../../domain/settings/provider-id";

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ providerId: string; key: string }> }
) {
  const { providerId, key } = await params;

  const guard = checkSettingsWriteEnabled({
    routeName: `settings/providers/${providerId}/secret/${key}`,
  });
  if (guard) return guard;

  try {
    await deleteProviderSecret({
      providerId: providerId as ProviderId,
      key,
    });

    await updateProviderStatus(
      providerId as ProviderId,
      "not_configured",
      "비밀키가 삭제되었습니다."
    );

    const updated = await getProviderSettings(providerId as ProviderId);
    return createSafeResponse(updated);
  } catch (err: any) {
    return createSafeResponse(
      {
        value: null,
        status: "error",
        source: "Provider Settings API",
        sourceTier: "official",
        warnings: [],
        updatedAt: null,
        message: err?.message || String(err),
      },
      500
    );
  }
}

export const dynamic = "force-dynamic";
