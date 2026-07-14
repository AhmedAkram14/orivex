/**
 * Query key convention: every module's query keys are a tuple starting
 * with the module/domain name, so invalidating `['doctors']` invalidates
 * every doctor-related query regardless of how specific the leaf key is —
 * the same hierarchical-invalidation pattern TanStack Query's own docs
 * recommend, named here once so every feature module follows it instead of
 * inventing its own shape.
 *
 * Usage in a feature module:
 *   const doctorKeys = createQueryKeyFactory('doctors');
 *   doctorKeys.all              -> ['doctors']
 *   doctorKeys.list({ page: 1 }) -> ['doctors', 'list', { page: 1 }]
 *   doctorKeys.detail(id)        -> ['doctors', 'detail', id]
 */
export function createQueryKeyFactory<TDomain extends string>(domain: TDomain) {
  return {
    all: [domain] as const,
    lists: () => [domain, 'list'] as const,
    list: (params?: unknown) => [domain, 'list', params] as const,
    details: () => [domain, 'detail'] as const,
    detail: (id: string | number) => [domain, 'detail', id] as const,
  };
}
