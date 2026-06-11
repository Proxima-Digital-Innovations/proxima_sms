export const tenantContext = new AsyncLocalStorage<{ schoolId?: string; isGlobal?: boolean }>();

/**
 * Runs a function within a specific tenant context.
 */
export function withTenant(schoolId: string, fn: () => any) {
  return tenantContext.run({ schoolId }, fn);
}

/**
 * Runs a function with global privileges (bypasses tenant check).
 */
export function withGlobal<T>(fn: () => T): T {
  return tenantContext.run({ isGlobal: true }, fn);
}

/**
 * Retrieves the current schoolId from the async storage.
 */
export function getTenantId() {
  return tenantContext.getStore()?.schoolId;
}

/**
 * Checks if the current context is global.
 */
export function isGlobalContext() {
  return tenantContext.getStore()?.isGlobal === true;
}
