import { supabase } from './supabase';
import type { UserProfile, UserRole, AuditLog } from '../types';

const ALLOWED_DOMAIN = 'institution.edu';

export function isInstitutionalEmail(email: string): boolean {
  return email.toLowerCase().endsWith(`@${ALLOWED_DOMAIN}`);
}

export async function logAuditEvent(
  userEmail: string,
  action: string,
  eventType: AuditLog['event_type'],
  details?: Record<string, unknown>
): Promise<void> {
  try {
    await supabase.from('audit_logs').insert({
      user_email: userEmail,
      action,
      event_type: eventType,
      details: details ?? null,
    });
  } catch {
    // Silent fail - audit logging should not block user actions
  }
}

export async function fetchUserProfile(userId: string): Promise<UserProfile | null> {
  const { data, error } = await supabase
    .from('user_profiles')
    .select('*')
    .eq('id', userId)
    .maybeSingle();

  if (error || !data) return null;
  return data as UserProfile;
}

export async function updateLastLogin(userId: string): Promise<void> {
  await supabase
    .from('user_profiles')
    .update({ last_login: new Date().toISOString() })
    .eq('id', userId);
}

export function canAccess(role: UserRole | undefined, required: UserRole[]): boolean {
  if (!role) return false;
  return required.includes(role);
}

export const ROLE_PERMISSIONS = {
  administrator: {
    canExport: true,
    canManageUsers: true,
    canChangeSettings: true,
    canResolveAlerts: true,
    canViewAnalytics: true,
    canViewAuditLogs: true,
  },
  maintenance_staff: {
    canExport: false,
    canManageUsers: false,
    canChangeSettings: false,
    canResolveAlerts: true,
    canViewAnalytics: true,
    canViewAuditLogs: false,
  },
  viewer: {
    canExport: false,
    canManageUsers: false,
    canChangeSettings: false,
    canResolveAlerts: false,
    canViewAnalytics: true,
    canViewAuditLogs: false,
  },
} as const;
