export function extractArray<T>(payload: unknown, preferredKeys: string[] = []): T[] {
  const seen = new Set<unknown>();

  const visit = (node: unknown): T[] | null => {
    if (Array.isArray(node)) return node as T[];
    if (!node || typeof node !== 'object' || seen.has(node)) return null;
    seen.add(node);

    const obj = node as Record<string, unknown>;

    for (const key of preferredKeys) {
      const candidate = obj[key];
      if (Array.isArray(candidate)) return candidate as T[];
    }

    const commonKeys = [
      'content', 'items', 'data', 'results', 'rows', 'list',
      'roles', 'users', 'permissions', 'forms', 'modules',
      'logs', 'assignments', 'menu', 'menuTree'
    ];

    for (const key of commonKeys) {
      const candidate = obj[key];
      if (Array.isArray(candidate)) return candidate as T[];
    }

    for (const value of Object.values(obj)) {
      const nested = visit(value);
      if (nested) return nested;
    }

    return null;
  };

  return visit(payload) ?? [];
}

