import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import type { Sensor, Alert, AuditLog, SystemSettings } from '../types';

export function useSensors() {
  const [sensors, setSensors] = useState<Sensor[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchSensors = useCallback(async () => {
    try {
      const { data, error: err } = await supabase
        .from('sensors')
        .select('*')
        .order('floor', { ascending: true });

      if (err) throw err;
      setSensors(data || []);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchSensors();

    const subscription = supabase
      .channel('sensors')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'sensors' }, () => {
        fetchSensors();
      })
      .subscribe();

    return () => {
      subscription.unsubscribe();
    };
  }, [fetchSensors]);

  return { sensors, loading, error, refetch: fetchSensors };
}

export function useAlerts() {
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchAlerts = useCallback(async () => {
    try {
      const { data, error: err } = await supabase
        .from('alerts')
        .select('*')
        .order('created_at', { ascending: false });

      if (err) throw err;
      setAlerts(data || []);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchAlerts();

    const subscription = supabase
      .channel('alerts')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'alerts' }, () => {
        fetchAlerts();
      })
      .subscribe();

    return () => {
      subscription.unsubscribe();
    };
  }, [fetchAlerts]);

  const acknowledgeAlert = async (alertId: string) => {
    const { error: err } = await supabase
      .from('alerts')
      .update({
        status: 'acknowledged'
      })
      .eq('id', alertId);

    if (err) throw err;
    fetchAlerts();
  };

  const resolveAlert = async (alertId: string) => {
    const { error: err } = await supabase
      .from('alerts')
      .update({
        status: 'resolved',
        resolved_at: new Date().toISOString()
      })
      .eq('id', alertId);

    if (err) throw err;
    fetchAlerts();
  };

  return { alerts, loading, error, refetch: fetchAlerts, acknowledgeAlert, resolveAlert };
}

export function usePressureReadings(sensorId: string | null, limit = 100) {
  const [readings, setReadings] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!sensorId) {
      setReadings([]);
      setLoading(false);
      return;
    }

    const fetchReadings = async () => {
      try {
        const { data, error: err } = await supabase
          .from('pressure_readings')
          .select('*')
          .eq('sensor_id', sensorId)
          .order('recorded_at', { ascending: false })
          .limit(limit);

        if (err) throw err;
        setReadings((data || []).reverse());
      } catch (err: any) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchReadings();
  }, [sensorId, limit]);

  return { readings, loading, error };
}

export function useAuditLogs(limit = 100) {
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchLogs = async () => {
      try {
        const { data, error: err } = await supabase
          .from('audit_logs')
          .select('*')
          .order('created_at', { ascending: false })
          .limit(limit);

        if (err) throw err;
        setLogs(data || []);
      } catch (err: any) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchLogs();
  }, [limit]);

  return { logs, loading, error };
}

export function useSettings() {
  const [settings, setSettings] = useState<SystemSettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchSettings = async () => {
      try {
        const { data, error: err } = await supabase
          .from('system_settings')
          .select('*')
          .eq('id', 1)
          .single();

        if (err) throw err;
        setSettings(data);
      } catch (err: any) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchSettings();
  }, []);

  const updateSettings = async (updates: Partial<SystemSettings>) => {
    const { error: err } = await supabase
      .from('system_settings')
      .update(updates)
      .eq('id', 1);

    if (err) throw err;
  };

  return { settings, loading, error, updateSettings };
}
