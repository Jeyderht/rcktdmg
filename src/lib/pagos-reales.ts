/**
 * Fail-closed switch for real payment integrations. A deployed preview must never
 * charge customers merely because a provider secret happens to be configured.
 * Enabling real charges requires an explicit, separate launch decision.
 */
type EntornoPagos = {
  NODE_ENV?: string;
  RCKTX_ENABLE_REAL_PAYMENTS?: string;
  CULQI_SECRET_KEY?: string;
  CULQI_WEBHOOK_SECRET?: string;
};

export function pagosRealesHabilitados(env: EntornoPagos = process.env): boolean {
  return env.NODE_ENV === "production" &&
    env.RCKTX_ENABLE_REAL_PAYMENTS === "true" &&
    Boolean(env.CULQI_SECRET_KEY?.trim()) &&
    Boolean(env.CULQI_WEBHOOK_SECRET?.trim());
}
