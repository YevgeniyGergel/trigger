import type { Instrumentation } from "next";

/**
 * Baseline error visibility for production (design.md risk: LiqPay/Telegram
 * webhook and background-job failures fail silently if nobody's watching).
 * Deliberately no SDK dependency here — matches the rest of the codebase
 * (raw fetch over heavy provider SDKs). If/when a Sentry (or similar) DSN is
 * provisioned, swap the console.error below for that provider's ingest call;
 * until then Vercel's own function logs are the collection point, and this
 * at least gives every uncaught error one consistent, greppable shape.
 */
export const onRequestError: Instrumentation.onRequestError = async (error, request, context) => {
  const message = error instanceof Error ? error.message : String(error);
  console.error("[unhandled-error]", {
    message,
    path: request.path,
    method: request.method,
    routeType: context.routeType,
    routePath: context.routePath,
  });
};
