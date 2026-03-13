'use client';

import { useState, useEffect, useCallback } from 'react';

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
  id: number;
  formId: number | null;
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
      const res = await fetch('http://localhost:8080/api/auth/permissions', {
        credentials: 'include'
      });
      
      if (!res.ok) {
        if (res.status === 401) {
          clearPermissionsCache();
          setAssignments([]);
        }
        throw new Error('Failed to fetch permissions');
      }
      const data = await res.json();
      
      permissionsCache = data;
      lastFetchTime = Date.now();
      setAssignments(data);
      setError(null);
    } catch (err: any) {
      setError(err.message);
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
  const hasPermission = useCallback((permission: Permission, formId?: number | null) => {
    return assignments.some(assignment => {
      // Check if assignment is global (formId is null) or matches specific formId
      const matchesScope = assignment.formId === null || (formId !== undefined && assignment.formId === formId);
      
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
