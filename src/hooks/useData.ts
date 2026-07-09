import { useEffect, useState, useCallback, useRef } from 'react';
import { supabase } from '../lib/supabase';
import type { Sensor, Alert, PressureReading, TankReading, SystemSettings, AuditLog, UserProfile, UserNotificationSettings, SensorCalibration, LoginActivity } from '../types';

export function useSensors() {
  const [sensors, setSensors] = useState<Sensor[]>([]);
  const [loading, setLoading] = useState(true);

  const fetch = useCallback(async () => {
    const { data, error } = await supabase
      .from('sensors')
      .select('*')
      .order('floor', { ascending: true });
    if (!error && data) setSensors(data as Sensor[]);
    setLoading(false);
  }, []);

  useEffect(() => { fetch(); }, [fetch]);
  return { sensors, loading, refetch: fetch };
}

export function useAlerts() {
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [loading, setLoading] = useState(true);

  const fetch = useCallback(async () => {
    const { data, error } = await supabase
      .from('alerts')
      .select('*')
      .order('created_at', { ascending: false });
    if (!error && data) setAlerts(data as Alert[]);
    setLoading(false);
  }, []);

  useEffect(() => { fetch(); }, [fetch]);
  return { alerts, loading, refetch: fetch };
}

export function usePressureReadings(sensorId?: string, hours = 24) {
  const [readings, setReadings] = useState<PressureReading[]>([]);
  const [loading, setLoading] = useState(true);

  const fetch = useCallback(async () => {
    const since = new Date(Date.now() - hours * 3600 * 1000).toISOString();
    let query = supabase
      .from('pressure_readings')
      .select('*')
      .gte('recorded_at', since)
      .order('recorded_at', { ascending: true });
    if (sensorId) query = query.eq('sensor_id', sensorId);
    const { data, error } = await query;
    if (!error && data) setReadings(data as PressureReading[]);
    setLoading(false);
  }, [sensorId, hours]);

  useEffect(() => { fetch(); }, [fetch]);
  return { readings, loading, refetch: fetch };
}

export function useTankReadings(sensorId?: string, hours = 24) {
  const [readings, setReadings] = useState<TankReading[]>([]);
  const [loading, setLoading] = useState(true);

  const fetch = useCallback(async () => {
    const since = new Date(Date.now() - hours * 3600 * 1000).toISOString();
    let query = supabase
      .from('tank_readings')
      .select('*')
      .gte('recorded_at', since)
      .order('recorded_at', { ascending: true });
    if (sensorId) query = query.eq('sensor_id', sensorId);
    const { data, error } = await query;
    if (!error && data) setReadings(data as TankReading[]);
    setLoading(false);
  }, [sensorId, hours]);

  useEffect(() => { fetch(); }, [fetch]);
  return { readings, loading, refetch: fetch };
}

export function useSettings() {
  const [settings, setSettings] = useState<SystemSettings | null>(null);
  const [loading, setLoading] = useState(true);

  const fetch = useCallback(async () => {
    const { data, error } = await supabase
      .from('system_settings')
      .select('*')
      .eq('id', 1)
      .maybeSingle();
    if (!error && data) setSettings(data as SystemSettings);
    setLoading(false);
  }, []);

  useEffect(() => { fetch(); }, [fetch]);
  return { settings, loading, refetch: fetch, setSettings };
}

export function useAuditLogs(limit = 100) {
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState(true);

  const fetch = useCallback(async () => {
    const { data, error } = await supabase
      .from('audit_logs')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(limit);
    if (!error && data) setLogs(data as AuditLog[]);
    setLoading(false);
  }, [limit]);

  useEffect(() => { fetch(); }, [fetch]);
  return { logs, loading, refetch: fetch };
}

export function useUsers() {
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [loading, setLoading] = useState(true);

  const fetch = useCallback(async () => {
    const { data, error } = await supabase
      .from('user_profiles')
      .select('*')
      .order('created_at', { ascending: false });
    if (!error && data) setUsers(data as UserProfile[]);
    setLoading(false);
  }, []);

  useEffect(() => { fetch(); }, [fetch]);
  return { users, loading, refetch: fetch };
}

export function useAutoRefresh(callback: () => void, intervalSec: number, enabled = true) {
  const savedCallback = useRef(callback);
  useEffect(() => { savedCallback.current = callback; }, [callback]);

  useEffect(() => {
    if (!enabled || intervalSec <= 0) return;
    const id = setInterval(() => savedCallback.current(), intervalSec * 1000);
    return () => clearInterval(id);
  }, [intervalSec, enabled]);
}

// Chat history types
export interface ChatSession {
  id: string;
  title: string;
  summary: string | null;
  is_archived: boolean;
  created_at: string;
  updated_at: string;
}

export interface ChatMessage {
  id: string;
  session_id: string;
  role: 'user' | 'assistant';
  content: string;
  suggestions: string[] | null;
  created_at: string;
}

// Hook for managing chat sessions and messages
export function useChatHistory() {
  const [sessions, setSessions] = useState<ChatSession[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchSessions = useCallback(async () => {
    const { data, error } = await supabase
      .from('chat_sessions')
      .select('*')
      .eq('is_archived', false)
      .order('updated_at', { ascending: false })
      .limit(20);
    if (!error && data) setSessions(data as ChatSession[]);
    setLoading(false);
  }, []);

  useEffect(() => { fetchSessions(); }, [fetchSessions]);

  const createSession = useCallback(async (title: string = 'New Chat'): Promise<ChatSession | null> => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return null;

    const { data, error } = await supabase
      .from('chat_sessions')
      .insert({ user_id: user.id, title })
      .select()
      .single();
    if (error) {
      console.error('Error creating session:', error);
      return null;
    }
    await fetchSessions();
    return data as ChatSession;
  }, [fetchSessions]);

  const updateSessionTitle = useCallback(async (sessionId: string, title: string) => {
    const { error } = await supabase
      .from('chat_sessions')
      .update({ title, updated_at: new Date().toISOString() })
      .eq('id', sessionId);
    if (!error) await fetchSessions();
  }, [fetchSessions]);

  const archiveSession = useCallback(async (sessionId: string) => {
    const { error } = await supabase
      .from('chat_sessions')
      .update({ is_archived: true, updated_at: new Date().toISOString() })
      .eq('id', sessionId);
    if (!error) await fetchSessions();
  }, [fetchSessions]);

  const deleteSession = useCallback(async (sessionId: string) => {
    const { error } = await supabase
      .from('chat_sessions')
      .delete()
      .eq('id', sessionId);
    if (!error) await fetchSessions();
  }, [fetchSessions]);

  const getMessages = useCallback(async (sessionId: string): Promise<ChatMessage[]> => {
    const { data, error } = await supabase
      .from('chat_messages')
      .select('*')
      .eq('session_id', sessionId)
      .order('created_at', { ascending: true });
    if (error) {
      console.error('Error fetching messages:', error);
      return [];
    }
    return (data as ChatMessage[]).map((m) => ({
      ...m,
      suggestions: m.suggestions as string[] | null,
    }));
  }, []);

  const addMessage = useCallback(async (
    sessionId: string,
    role: 'user' | 'assistant',
    content: string,
    suggestions?: string[]
  ): Promise<ChatMessage | null> => {
    const { data, error } = await supabase
      .from('chat_messages')
      .insert({
        session_id: sessionId,
        role,
        content,
        suggestions: suggestions || null,
      })
      .select()
      .single();
    if (error) {
      console.error('Error adding message:', error);
      return null;
    }
    // Update session's updated_at
    await supabase
      .from('chat_sessions')
      .update({ updated_at: new Date().toISOString() })
      .eq('id', sessionId);
    return data as ChatMessage;
  }, []);

  return {
    sessions,
    loading,
    refetch: fetchSessions,
    createSession,
    updateSessionTitle,
    archiveSession,
    deleteSession,
    getMessages,
    addMessage,
  };
}

// Hook for user notification settings
export function useNotificationSettings() {
  const [settings, setSettings] = useState<UserNotificationSettings | null>(null);
  const [loading, setLoading] = useState(true);

  const fetch = useCallback(async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      setLoading(false);
      return;
    }

    const { data, error } = await supabase
      .from('user_notification_settings')
      .select('*')
      .eq('user_id', user.id)
      .maybeSingle();

    if (!error && data) {
      setSettings(data as UserNotificationSettings);
    } else if (!data) {
      // Create default settings
      const { data: newSettings, error: createError } = await supabase
        .from('user_notification_settings')
        .insert({ user_id: user.id })
        .select()
        .single();
      if (!createError && newSettings) {
        setSettings(newSettings as UserNotificationSettings);
      }
    }
    setLoading(false);
  }, []);

  useEffect(() => { fetch(); }, [fetch]);

  const updateSettings = useCallback(async (updates: Partial<UserNotificationSettings>) => {
    if (!settings) return;

    const { error } = await supabase
      .from('user_notification_settings')
      .update({ ...updates, updated_at: new Date().toISOString() })
      .eq('id', settings.id);

    if (!error) {
      setSettings({ ...settings, ...updates });
    }
    return !error;
  }, [settings]);

  return { settings, loading, updateSettings, refetch: fetch };
}

// Hook for sensor calibration
export function useSensorCalibration(sensorId?: string) {
  const [calibrations, setCalibrations] = useState<SensorCalibration[]>([]);
  const [loading, setLoading] = useState(true);

  const fetch = useCallback(async () => {
    let query = supabase
      .from('sensor_calibration')
      .select('*')
      .order('calibration_date', { ascending: false });

    if (sensorId) {
      query = query.eq('sensor_id', sensorId);
    }

    const { data, error } = await query;
    if (!error && data) setCalibrations(data as SensorCalibration[]);
    setLoading(false);
  }, [sensorId]);

  useEffect(() => { fetch(); }, [fetch]);

  const addCalibration = useCallback(async (
    sensorId: string,
    offset: number,
    scale: number,
    notes?: string,
    nextDate?: string
  ): Promise<SensorCalibration | null> => {
    const { data: { user } } = await supabase.auth.getUser();

    const { data, error } = await supabase
      .from('sensor_calibration')
      .insert({
        sensor_id: sensorId,
        calibration_offset: offset,
        calibration_scale: scale,
        calibrated_by: user?.id,
        notes,
        next_calibration_date: nextDate,
      })
      .select()
      .single();

    if (error) {
      console.error('Error adding calibration:', error);
      return null;
    }

    await fetch();
    return data as SensorCalibration;
  }, [fetch]);

  return { calibrations, loading, addCalibration, refetch: fetch };
}

// Hook for login activity
export function useLoginActivity(limit = 20) {
  const [activities, setActivities] = useState<LoginActivity[]>([]);
  const [loading, setLoading] = useState(true);

  const fetch = useCallback(async () => {
    const { data, error } = await supabase
      .from('login_activity')
      .select('*')
      .order('login_time', { ascending: false })
      .limit(limit);

    if (!error && data) setActivities(data as LoginActivity[]);
    setLoading(false);
  }, [limit]);

  useEffect(() => { fetch(); }, [fetch]);

  return { activities, loading, refetch: fetch };
}

// Hook for user management operations
export function useUserManagement() {
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [loading, setLoading] = useState(true);

  const fetch = useCallback(async () => {
    const { data, error } = await supabase
      .from('user_profiles')
      .select('*')
      .order('created_at', { ascending: false });

    if (!error && data) setUsers(data as UserProfile[]);
    setLoading(false);
  }, []);

  useEffect(() => { fetch(); }, [fetch]);

  const updateUserRole = useCallback(async (userId: string, role: string): Promise<boolean> => {
    const { error } = await supabase
      .from('user_profiles')
      .update({ role })
      .eq('id', userId);

    if (!error) await fetch();
    return !error;
  }, [fetch]);

  const toggleUserActive = useCallback(async (userId: string, active: boolean): Promise<boolean> => {
    const { error } = await supabase
      .from('user_profiles')
      .update({ active })
      .eq('id', userId);

    if (!error) await fetch();
    return !error;
  }, [fetch]);

  const updateUserDepartment = useCallback(async (userId: string, department: string): Promise<boolean> => {
    const { error } = await supabase
      .from('user_profiles')
      .update({ department })
      .eq('id', userId);

    if (!error) await fetch();
    return !error;
  }, [fetch]);

  return {
    users,
    loading,
    refetch: fetch,
    updateUserRole,
    toggleUserActive,
    updateUserDepartment,
  };
}
