/**
 * Secret Write Guard
 * 
 * production에서 settings write route는 기본 차단
 * LOCAL_SETTINGS_WRITE_ENABLED=true인 경우에만 허용
 */
export type SettingsWriteGuardParams = {
  routeName: string;
};

export function checkSettingsWriteEnabled(params: SettingsWriteGuardParams): Response | null {
  const isProduction = process.env.NODE_ENV === "production";
  const localSettingsWriteEnabled = process.env.LOCAL_SETTINGS_WRITE_ENABLED === "true";

  if (isProduction && !localSettingsWriteEnabled) {
    return Response.json(
      {
        ok: false,
        status: "forbidden",
        message: `Settings write route [${params.routeName}] is not available in production without LOCAL_SETTINGS_WRITE_ENABLED=true.`,
      },
      { status: 403 }
    );
  }

  if (!localSettingsWriteEnabled) {
    return Response.json(
      {
        ok: false,
        status: "disabled",
        message: `Settings write route [${params.routeName}] is disabled. Set LOCAL_SETTINGS_WRITE_ENABLED=true in env to enable.`,
      },
      { status: 405 }
    );
  }

  return null;
}
