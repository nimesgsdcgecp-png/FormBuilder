'use client';

import { useState, useEffect, useCallback } from 'react';
import { AUTH } from '@/utils/apiConstants';
import { extractArray } from '@/utils/apiData';

export type Permission = 
  | 'READ' 
  | 'WRITE' 
  | 'EDIT' 
  | 'DELETE' 
  | 'APPROVE' 
  | 'MANAGE' 
  | 'EXPORT' 
  | 'AUDIT' 
  | 'VISIBILITY';

interface UserAssignment {
  id: string | number;
  formId: string | number | null;
  role: {
    id: number;
    name: string;
    permissions: Array<{
      id: number;
      name: Permission;
    }>;
  };
}

// Simple in-memory cache to avoid redundant fetches across components
let permissionsCache: UserAssignment[] | null = null;
let lastFetchTime: number = 0;
const CACHE_TTL = 1000 * 60 * 5; // 5 minutes

export function clearPermissionsCache() {
  permissionsCache = null;
  lastFetchTime = 0;
}

export function usePermissions() {
  const [assignments, setAssignments] = useState<UserAssignment[]>(permissionsCache || []);
  const [isLoading, setIsLoading] = useState(!permissionsCache);
  const [error, setError] = useState<string | null>(null);

  const fetchPermissions = useCallback(async (force = false) => {
    if (!force && permissionsCache && (Date.now() - lastFetchTime < CACHE_TTL)) {
      setAssignments(permissionsCache);
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    try {
      const res = await fetch(AUTH.PERMISSIONS, {
        credentials: 'include'
      });
      
      if (!res.ok) {
        if (res.status === 401) {
          clearPermissionsCache();
          setAssignments([]);
        }
        throw new Error('Failed to fetch permissions');
      }
      const raw = await res.json();
      const data = extractArray<UserAssignment>(raw, ['assignments', 'content']);

      permissionsCache = data;
      lastFetchTime = Date.now();
      setAssignments(data);
      setError(null);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to fetch permissions');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchPermissions();
  }, [fetchPermissions]);

  /**
   * Checks if user has a permission.
   * @param permission The permission to check for.
   * @param formId Optional form ID for scoped permission check.
   */
  const hasPermission = useCallback((permission: Permission, formId?: string | number | null) => {
    return assignments.some(assignment => {
      // Check if assignment is global (formId is null) or matches specific formId
      // Use string comparison to handle both UUID strings and legacy numbers
      const matchesScope = !assignment.formId || 
                          (formId !== undefined && String(assignment.formId) === String(formId));
      
      if (matchesScope) {
        return assignment.role.permissions.some(p => p.name === permission);
      }
      return false;
    });
  }, [assignments]);

  return {
    assignments,
    isLoading,
    error,
    hasPermission,
    refreshPermissions: () => fetchPermissions(true),
    clearCache: clearPermissionsCache
  };
}
