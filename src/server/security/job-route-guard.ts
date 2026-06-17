/**
 * Production Job Route Guard
 * 
 * Job routes는 프로덕션에서 기본 차단된다.
 * LOCAL_JOB_ROUTES_ENABLED=true 이고 해당 route flag가 true여야만 허용된다.
 */
export type JobRouteGuardParams = {
  routeFlag: string | undefined;
  routeName: string;
};

export function checkJobRouteEnabled(params: JobRouteGuardParams): Response | null {
  const isProduction = process.env.NODE_ENV === "production";
  const localRoutesEnabled = process.env.LOCAL_JOB_ROUTES_ENABLED === "true";
  const routeEnabled = params.routeFlag === "true";

  if (isProduction) {
    return Response.json(
      {
        ok: false,
        status: "forbidden",
        message: `Job route [${params.routeName}] is not available in production.`,
      },
      { status: 403 }
    );
  }

  if (!localRoutesEnabled || !routeEnabled) {
    return Response.json(
      {
        ok: false,
        status: "disabled",
        message: `Job route [${params.routeName}] is disabled. Set LOCAL_JOB_ROUTES_ENABLED=true and the route-specific flag in .env.local to enable.`,
      },
      { status: 405 }
    );
  }

  return null;
}
