// In a single-tenant (on-premise) architecture, we default to one school ID.
// This completely removes the need for async_hooks or complex routing middleware.

const SINGLE_TENANT_ID = process.env.NEXT_PUBLIC_TENANT_ID || 'default-school';

/**
 * Runs a function within the single tenant context.
 */
export function withTenant(arg1: string | (() => any), arg2?: () => any) {
  const fn = typeof arg1 === 'function' ? arg1 : arg2;
  if (typeof fn !== 'function') throw new Error('withTenant requires a function');
  return fn();
}

/**
 * Runs a function with global privileges.
 */
export function withGlobal<T>(fn: () => T): T {
  return fn();
}

/**
 * Retrieves the single tenant ID.
 */
export function getTenantId() {
  return SINGLE_TENANT_ID;
}

/**
 * Checks if the current context is global.
 */
export function isGlobalContext() {
  return true; // Or handle global context logic if needed, but for single-tenant, it's mostly moot.
}
