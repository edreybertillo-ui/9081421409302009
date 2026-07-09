import { useState, useEffect } from 'react';
import {
  Gauge, Droplets, Clock, Bell, Palette, Shield, Cpu, Users,
  Building2, Save, AlertTriangle, Check, ChevronDown, ChevronRight,
  Edit2, Trash2, Key, UserPlus, RefreshCw, Activity, Moon, Sun,
  Monitor, Calendar, Globe, Eye, Trash, X
} from 'lucide-react';
import { Card, CardHeader, Badge, PageHeader, LoadingSpinner, StatusDot } from '../components/ui';
import { useSettings, useNotificationSettings, useUserManagement, useSensors, useSensorCalibration, useLoginActivity, useAuditLogs } from '../hooks/useData';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { ROLE_PERMISSIONS, logAuditEvent } from '../lib/auth';
import { supabase } from '../lib/supabase';
import type { SystemSettings, UserProfile } from '../types';

type SettingsTab = 'general' | 'users' | 'notifications' | 'tank' | 'sensors' | 'system' | 'appearance' | 'security';

export function SettingsPage() {
  const { profile } = useAuth();
  const perms = profile ? ROLE_PERMISSIONS[profile.role] : null;
  const [activeTab, setActiveTab] = useState<SettingsTab>('general');
  const [expandedCards, setExpandedCards] = useState<Record<string, boolean>>({
    pressure: true,
    tank: true,
    refresh: true,
    institution: true,
  });

  const toggleCard = (card: string) => {
    setExpandedCards(prev => ({ ...prev, [card]: !prev[card] }));
  };

  const isReadOnly = !perms?.canChangeSettings;

  const tabs: { id: SettingsTab; label: string; icon: typeof Gauge }[] = [
    { id: 'general', label: 'General', icon: Building2 },
    { id: 'users', label: 'User Management', icon: Users },
    { id: 'notifications', label: 'Notifications', icon: Bell },
    { id: 'tank', label: 'Water Tank', icon: Droplets },
    { id: 'sensors', label: 'Sensors', icon: Cpu },
    { id: 'system', label: 'System', icon: Monitor },
    { id: 'appearance', label: 'Appearance', icon: Palette },
    { id: 'security', label: 'Security', icon: Shield },
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        title="Settings"
        subtitle="Configure and manage the Water Distribution Monitoring System"
        action={isReadOnly && <Badge variant="warning">Read-only — Admin access required</Badge>}
      />

      {isReadOnly && (
        <div className="flex items-center gap-2 p-3 rounded-xl bg-warning-50 dark:bg-warning-950/30 border border-warning-200 dark:border-warning-900">
          <AlertTriangle className="w-4 h-4 text-warning-600 dark:text-warning-400" />
          <span className="text-sm text-warning-700 dark:text-warning-400">You have view-only access. Contact an administrator to change settings.</span>
        </div>
      )}

      {/* Tabs */}
      <div className="flex flex-wrap gap-2">
        {tabs.map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium transition-all ${
              activeTab === tab.id
                ? 'bg-primary-100 dark:bg-primary-950 text-primary-700 dark:text-primary-300 border border-primary-200 dark:border-primary-800'
                : 'bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 border border-slate-200 dark:border-slate-800'
            }`}
          >
            <tab.icon className="w-4 h-4" />
            <span className="hidden sm:inline">{tab.label}</span>
          </button>
        ))}
      </div>

      {/* Tab Content */}
      <div className="space-y-6">
        {activeTab === 'general' && <GeneralSettings isReadOnly={isReadOnly} expandedCards={expandedCards} toggleCard={toggleCard} />}
        {activeTab === 'users' && <UserManagementSection isReadOnly={isReadOnly} />}
        {activeTab === 'notifications' && <NotificationSettingsSection isReadOnly={isReadOnly} />}
        {activeTab === 'tank' && <TankConfigurationSection isReadOnly={isReadOnly} />}
        {activeTab === 'sensors' && <SensorConfigurationSection isReadOnly={isReadOnly} />}
        {activeTab === 'system' && <SystemConfigurationSection isReadOnly={isReadOnly} />}
        {activeTab === 'appearance' && <AppearanceSection isReadOnly={isReadOnly} />}
        {activeTab === 'security' && <SecuritySection isReadOnly={isReadOnly} />}
      </div>
    </div>
  );
}

// General Settings Section
function GeneralSettings({ isReadOnly, expandedCards, toggleCard }: { isReadOnly: boolean; expandedCards: Record<string, boolean>; toggleCard: (card: string) => void }) {
  const { profile } = useAuth();
  const { settings, loading, setSettings } = useSettings();
  const [form, setForm] = useState<SystemSettings | null>(null);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [validationErrors, setValidationErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    if (settings) setForm(settings);
  }, [settings]);

  const validate = (): boolean => {
    const errors: Record<string, string> = {};
    if (!form) return false;

    if (form.pressure_min >= form.pressure_max) {
      errors.pressure = 'Min pressure must be less than max pressure';
    }
    if (form.pressure_critical_low >= form.pressure_min) {
      errors.pressureCritical = 'Critical low must be less than min pressure';
    }
    if (form.pressure_critical_high <= form.pressure_max) {
      errors.pressureCriticalHigh = 'Critical high must be greater than max pressure';
    }
    if (form.tank_critical_level >= form.tank_low_level) {
      errors.tank = 'Critical level must be less than low level';
    }
    if (form.auto_refresh_interval < 1 || form.auto_refresh_interval > 60) {
      errors.refresh = 'Refresh interval must be between 1 and 60 seconds';
    }

    setValidationErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSave = async () => {
    if (!form || !validate()) return;
    setSaving(true);

    const { error } = await supabase
      .from('system_settings')
      .update({
        pressure_min: form.pressure_min,
        pressure_max: form.pressure_max,
        pressure_critical_low: form.pressure_critical_low,
        pressure_critical_high: form.pressure_critical_high,
        tank_critical_level: form.tank_critical_level,
        tank_low_level: form.tank_low_level,
        auto_refresh_interval: form.auto_refresh_interval,
        institution_name: form.institution_name,
        updated_at: new Date().toISOString(),
      })
      .eq('id', 1);

    if (!error) {
      if (profile) {
        await logAuditEvent(profile.email, 'Updated system settings', 'settings_change', {});
      }
      setSettings(form);
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    }
    setSaving(false);
  };

  if (loading || !form) {
    return <div className="flex items-center justify-center h-64"><LoadingSpinner size="lg" /></div>;
  }

  return (
    <div className="space-y-6">
      {/* Save Button */}
      <div className="flex justify-end">
        <button onClick={handleSave} disabled={saving || isReadOnly} className="btn-primary">
          {saving ? <LoadingSpinner size="sm" /> : saved ? <Check className="w-4 h-4" /> : <Save className="w-4 h-4" />}
          {saved ? 'Saved!' : 'Save Changes'}
        </button>
      </div>

      {/* Pressure Thresholds */}
      <CollapsibleCard
        title="Pressure Alert Thresholds"
        subtitle="Configure normal and critical pressure ranges"
        icon={Gauge}
        expanded={expandedCards.pressure}
        onToggle={() => toggleCard('pressure')}
        error={validationErrors.pressure || validationErrors.pressureCritical || validationErrors.pressureCriticalHigh}
      >
        {validationErrors.pressure && (
          <p className="text-sm text-error-600 dark:text-error-400 mb-4">{validationErrors.pressure}</p>
        )}
        {validationErrors.pressureCritical && (
          <p className="text-sm text-error-600 dark:text-error-400 mb-4">{validationErrors.pressureCritical}</p>
        )}
        {validationErrors.pressureCriticalHigh && (
          <p className="text-sm text-error-600 dark:text-error-400 mb-4">{validationErrors.pressureCriticalHigh}</p>
        )}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <ThresholdInput label="Min Pressure (bar)" value={form.pressure_min} onChange={(v) => setForm({ ...form, pressure_min: v })} disabled={isReadOnly} step={0.1} min={0} max={20} helpText="Normal minimum threshold" />
          <ThresholdInput label="Max Pressure (bar)" value={form.pressure_max} onChange={(v) => setForm({ ...form, pressure_max: v })} disabled={isReadOnly} step={0.1} min={0} max={20} helpText="Normal maximum threshold" />
          <ThresholdInput label="Critical Low (bar)" value={form.pressure_critical_low} onChange={(v) => setForm({ ...form, pressure_critical_low: v })} disabled={isReadOnly} step={0.1} min={0} max={20} helpText="Triggers critical alert" />
          <ThresholdInput label="Critical High (bar)" value={form.pressure_critical_high} onChange={(v) => setForm({ ...form, pressure_critical_high: v })} disabled={isReadOnly} step={0.1} min={0} max={20} helpText="Triggers critical alert" />
        </div>
      </CollapsibleCard>

      {/* Tank Level Thresholds */}
      <CollapsibleCard
        title="Tank Level Thresholds"
        subtitle="Configure low and critical tank level alerts"
        icon={Droplets}
        expanded={expandedCards.tank}
        onToggle={() => toggleCard('tank')}
        error={validationErrors.tank}
      >
        {validationErrors.tank && (
          <p className="text-sm text-error-600 dark:text-error-400 mb-4">{validationErrors.tank}</p>
        )}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <ThresholdInput label="Low Level (%)" value={form.tank_low_level} onChange={(v) => setForm({ ...form, tank_low_level: v })} disabled={isReadOnly} step={1} min={0} max={100} helpText="Triggers low level warning" />
          <ThresholdInput label="Critical Level (%)" value={form.tank_critical_level} onChange={(v) => setForm({ ...form, tank_critical_level: v })} disabled={isReadOnly} step={1} min={0} max={100} helpText="Triggers critical alert" />
        </div>
      </CollapsibleCard>

      {/* Auto-refresh & Institution */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <CollapsibleCard
          title="Auto-Refresh Interval"
          subtitle="How often live data refreshes"
          icon={Clock}
          expanded={expandedCards.refresh}
          onToggle={() => toggleCard('refresh')}
          error={validationErrors.refresh}
        >
          {validationErrors.refresh && (
            <p className="text-sm text-error-600 dark:text-error-400 mb-4">{validationErrors.refresh}</p>
          )}
          <ThresholdInput label="Refresh interval (seconds)" value={form.auto_refresh_interval} onChange={(v) => setForm({ ...form, auto_refresh_interval: v })} disabled={isReadOnly} step={1} min={1} max={60} helpText="Recommended: 3-10 seconds" />
        </CollapsibleCard>

        <CollapsibleCard
          title="Institution Information"
          subtitle="Organization details"
          icon={Building2}
          expanded={expandedCards.institution}
          onToggle={() => toggleCard('institution')}
        >
          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">Institution Name</label>
            <input
              type="text"
              value={form.institution_name}
              onChange={(e) => setForm({ ...form, institution_name: e.target.value })}
              disabled={isReadOnly}
              className="input"
            />
            <p className="text-xs text-slate-400 mt-1.5">Display name for reports and dashboards</p>
          </div>
        </CollapsibleCard>
      </div>
    </div>
  );
}

// User Management Section
function UserManagementSection({ isReadOnly }: { isReadOnly: boolean }) {
  const { profile } = useAuth();
  const { users, loading, updateUserRole, toggleUserActive, refetch } = useUserManagement();
  const [editingUser, setEditingUser] = useState<UserProfile | null>(null);
  const [showAddModal, setShowAddModal] = useState(false);
  const [saving, setSaving] = useState(false);

  const handleRoleChange = async (userId: string, newRole: string) => {
    setSaving(true);
    const success = await updateUserRole(userId, newRole);
    if (success && profile) {
      await logAuditEvent(profile.email, `Changed user role to ${newRole}`, 'role_change', { userId });
    }
    setSaving(false);
  };

  const handleToggleActive = async (userId: string, currentActive: boolean) => {
    if (!confirm(`Are you sure you want to ${currentActive ? 'disable' : 'enable'} this user?`)) return;
    setSaving(true);
    const success = await toggleUserActive(userId, !currentActive);
    if (success && profile) {
      await logAuditEvent(profile.email, `${currentActive ? 'Disabled' : 'Enabled'} user account`, currentActive ? 'user_disabled' : 'user_enabled', { userId });
    }
    setSaving(false);
  };

  if (loading) {
    return <div className="flex items-center justify-center h-64"><LoadingSpinner size="lg" /></div>;
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader
          icon={Users}
          title="User Management"
          subtitle={`${users.length} users registered`}
          action={!isReadOnly && (
            <button onClick={() => setShowAddModal(true)} className="btn-primary text-sm">
              <UserPlus className="w-4 h-4" /> Add User
            </button>
          )}
        />

        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-slate-200 dark:border-slate-800">
                <th className="text-left px-5 py-3 text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">User</th>
                <th className="text-left px-5 py-3 text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Role</th>
                <th className="text-left px-5 py-3 text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Status</th>
                <th className="text-left px-5 py-3 text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Last Login</th>
                <th className="text-right px-5 py-3 text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {users.map(user => (
                <tr key={user.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/50">
                  <td className="px-5 py-4">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-lg bg-primary-100 dark:bg-primary-900 flex items-center justify-center">
                        <span className="text-sm font-semibold text-primary-700 dark:text-primary-300">
                          {user.full_name.charAt(0).toUpperCase()}
                        </span>
                      </div>
                      <div>
                        <p className="font-medium text-slate-900 dark:text-slate-100">{user.full_name}</p>
                        <p className="text-sm text-slate-500 dark:text-slate-400">{user.email}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-5 py-4">
                    {editingUser?.id === user.id ? (
                      <select
                        value={user.role}
                        onChange={(e) => { handleRoleChange(user.id, e.target.value); setEditingUser(null); }}
                        className="input text-sm"
                        disabled={saving}
                      >
                        <option value="administrator">Administrator</option>
                        <option value="maintenance_staff">Maintenance Staff</option>
                        <option value="viewer">Viewer</option>
                      </select>
                    ) : (
                      <Badge variant={user.role === 'administrator' ? 'info' : user.role === 'maintenance_staff' ? 'warning' : 'neutral'}>
                        {user.role === 'administrator' ? 'Administrator' : user.role === 'maintenance_staff' ? 'Staff' : 'Viewer'}
                      </Badge>
                    )}
                  </td>
                  <td className="px-5 py-4">
                    <div className="flex items-center gap-2">
                      <StatusDot status={user.active ? 'online' : 'offline'} />
                      <span className={`text-sm ${user.active ? 'text-success-600 dark:text-success-400' : 'text-slate-400'}`}>
                        {user.active ? 'Active' : 'Inactive'}
                      </span>
                    </div>
                  </td>
                  <td className="px-5 py-4">
                    <span className="text-sm text-slate-500 dark:text-slate-400">
                      {user.last_login ? new Date(user.last_login).toLocaleDateString() : 'Never'}
                    </span>
                  </td>
                  <td className="px-5 py-4">
                    <div className="flex items-center justify-end gap-2">
                      {!isReadOnly && user.id !== profile?.id && (
                        <>
                          <button
                            onClick={() => setEditingUser(editingUser?.id === user.id ? null : user)}
                            className="btn-ghost p-2 text-slate-500 hover:text-primary-600"
                            title="Edit role"
                          >
                            <Edit2 className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleToggleActive(user.id, user.active)}
                            className={`btn-ghost p-2 ${user.active ? 'text-error-500 hover:text-error-600' : 'text-success-500 hover:text-success-600'}`}
                            title={user.active ? 'Disable user' : 'Enable user'}
                          >
                            {user.active ? <Trash2 className="w-4 h-4" /> : <Check className="w-4 h-4" />}
                          </button>
                        </>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>

      {/* Add User Modal */}
      {showAddModal && (
        <AddUserModal onClose={() => setShowAddModal(false)} onAdded={refetch} />
      )}
    </div>
  );
}

// Add User Modal
function AddUserModal({ onClose, onAdded }: { onClose: () => void; onAdded: () => void }) {
  const { profile } = useAuth();
  const [email, setEmail] = useState('');
  const [fullName, setFullName] = useState('');
  const [role, setRole] = useState('viewer');
  const [department, setDepartment] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    const { data, error: signUpError } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: { full_name: fullName },
        emailRedirectTo: undefined,
      },
    });

    if (signUpError) {
      setError(signUpError.message);
      setLoading(false);
      return;
    }

    if (data.user) {
      await supabase.from('user_profiles').update({
        role,
        department: department || null,
      }).eq('id', data.user.id);

      if (profile) {
        await logAuditEvent(profile.email, `Created new user: ${email}`, 'settings_change', { role });
      }
    }

    setLoading(false);
    onAdded();
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-sm">
      <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-xl w-full max-w-md mx-4">
        <div className="flex items-center justify-between p-5 border-b border-slate-200 dark:border-slate-800">
          <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-100">Add New User</h3>
          <button onClick={onClose} className="btn-ghost p-2"><X className="w-5 h-5" /></button>
        </div>
        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          {error && <p className="text-sm text-error-600 dark:text-error-400">{error}</p>}
          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">Full Name</label>
            <input type="text" value={fullName} onChange={(e) => setFullName(e.target.value)} required className="input" />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">Email</label>
            <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required className="input" />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">Password</label>
            <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} required minLength={6} className="input" />
            <p className="text-xs text-slate-400 mt-1">Minimum 6 characters</p>
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">Role</label>
            <select value={role} onChange={(e) => setRole(e.target.value)} className="input">
              <option value="administrator">Administrator</option>
              <option value="maintenance_staff">Maintenance Staff</option>
              <option value="viewer">Viewer</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">Department (optional)</label>
            <input type="text" value={department} onChange={(e) => setDepartment(e.target.value)} className="input" />
          </div>
          <div className="flex gap-3 pt-2">
            <button type="button" onClick={onClose} className="btn-secondary flex-1">Cancel</button>
            <button type="submit" disabled={loading} className="btn-primary flex-1">
              {loading ? <LoadingSpinner size="sm" /> : 'Create User'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// Notification Settings Section
function NotificationSettingsSection({ isReadOnly }: { isReadOnly: boolean }) {
  const { settings, loading, updateSettings } = useNotificationSettings();
  const [form, setForm] = useState(settings);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    if (settings) setForm(settings);
  }, [settings]);

  const handleSave = async () => {
    if (!form) return;
    setSaving(true);
    const success = await updateSettings({
      email_alerts_enabled: form.email_alerts_enabled,
      sms_alerts_enabled: form.sms_alerts_enabled,
      push_alerts_enabled: form.push_alerts_enabled,
      critical_alerts_only: form.critical_alerts_only,
      notification_frequency: form.notification_frequency,
      quiet_hours_enabled: form.quiet_hours_enabled,
      quiet_hours_start: form.quiet_hours_start,
      quiet_hours_end: form.quiet_hours_end,
    });
    if (success) {
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    }
    setSaving(false);
  };

  if (loading || !form) {
    return <div className="flex items-center justify-center h-64"><LoadingSpinner size="lg" /></div>;
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader
          icon={Bell}
          title="Notification Preferences"
          subtitle="Configure how you receive alerts"
          action={
            <button onClick={handleSave} disabled={saving || isReadOnly} className="btn-primary text-sm">
              {saving ? <LoadingSpinner size="sm" /> : saved ? <Check className="w-4 h-4" /> : <Save className="w-4 h-4" />}
              {saved ? 'Saved!' : 'Save'}
            </button>
          }
        />
        <div className="p-5 pt-0 space-y-4">
          <ToggleRow
            label="Email Notifications"
            description="Receive alert notifications via email"
            checked={form.email_alerts_enabled}
            onChange={(v) => setForm({ ...form, email_alerts_enabled: v })}
            disabled={isReadOnly}
          />
          <ToggleRow
            label="SMS Notifications"
            description="Receive critical alerts via SMS (coming soon)"
            checked={form.sms_alerts_enabled}
            onChange={(v) => setForm({ ...form, sms_alerts_enabled: v })}
            disabled
          />
          <ToggleRow
            label="Push Notifications"
            description="Browser push notifications for active alerts"
            checked={form.push_alerts_enabled}
            onChange={(v) => setForm({ ...form, push_alerts_enabled: v })}
            disabled={isReadOnly}
          />
          <ToggleRow
            label="Critical Alerts Only"
            description="Only notify for critical and high severity alerts"
            checked={form.critical_alerts_only}
            onChange={(v) => setForm({ ...form, critical_alerts_only: v })}
            disabled={isReadOnly}
          />
        </div>
      </Card>

      <Card>
        <CardHeader icon={Clock} title="Notification Frequency" subtitle="How often to receive alert summaries" />
        <div className="p-5 pt-0">
          <select
            value={form.notification_frequency}
            onChange={(e) => setForm({ ...form, notification_frequency: e.target.value as typeof form.notification_frequency })}
            disabled={isReadOnly}
            className="input"
          >
            <option value="immediate">Immediate</option>
            <option value="hourly">Hourly Summary</option>
            <option value="daily">Daily Summary</option>
            <option value="weekly">Weekly Summary</option>
          </select>
        </div>
      </Card>

      <Card>
        <CardHeader icon={Moon} title="Quiet Hours" subtitle="Mute notifications during specific hours" />
        <div className="p-5 pt-0 space-y-4">
          <ToggleRow
            label="Enable Quiet Hours"
            description="Pause notifications during set hours"
            checked={form.quiet_hours_enabled}
            onChange={(v) => setForm({ ...form, quiet_hours_enabled: v })}
            disabled={isReadOnly}
          />
          {form.quiet_hours_enabled && (
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">Start Time</label>
                <input
                  type="time"
                  value={form.quiet_hours_start}
                  onChange={(e) => setForm({ ...form, quiet_hours_start: e.target.value })}
                  disabled={isReadOnly}
                  className="input"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">End Time</label>
                <input
                  type="time"
                  value={form.quiet_hours_end}
                  onChange={(e) => setForm({ ...form, quiet_hours_end: e.target.value })}
                  disabled={isReadOnly}
                  className="input"
                />
              </div>
            </div>
          )}
        </div>
      </Card>
    </div>
  );
}

// Tank Configuration Section
function TankConfigurationSection({ isReadOnly }: { isReadOnly: boolean }) {
  const { profile } = useAuth();
  const { settings, loading, setSettings } = useSettings();
  const [form, setForm] = useState<SystemSettings | null>(null);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [validationErrors, setValidationErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    if (settings) setForm(settings);
  }, [settings]);

  const validate = (): boolean => {
    if (!form) return false;
    const errors: Record<string, string> = {};

    if (form.tank_capacity_liters <= 0) {
      errors.capacity = 'Tank capacity must be greater than 0';
    }
    if (form.tank_height_meters <= 0) {
      errors.height = 'Tank height must be greater than 0';
    }
    if (form.tank_min_level < 0 || form.tank_min_level >= form.tank_max_level) {
      errors.minMax = 'Min level must be between 0 and max level';
    }
    if (form.tank_critical_level >= form.tank_low_level) {
      errors.thresholds = 'Critical level must be less than warning level';
    }

    setValidationErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSave = async () => {
    if (!form || !validate()) return;
    setSaving(true);

    const { error } = await supabase
      .from('system_settings')
      .update({
        tank_capacity_liters: form.tank_capacity_liters,
        tank_height_meters: form.tank_height_meters,
        tank_min_level: form.tank_min_level,
        tank_max_level: form.tank_max_level,
        tank_warning_level: form.tank_warning_level,
        tank_critical_level: form.tank_critical_level,
        measurement_unit: form.measurement_unit,
        updated_at: new Date().toISOString(),
      })
      .eq('id', 1);

    if (!error) {
      if (profile) {
        await logAuditEvent(profile.email, 'Updated tank configuration', 'settings_change', {});
      }
      setSettings(form);
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    }
    setSaving(false);
  };

  if (loading || !form) {
    return <div className="flex items-center justify-center h-64"><LoadingSpinner size="lg" /></div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-end">
        <button onClick={handleSave} disabled={saving || isReadOnly} className="btn-primary">
          {saving ? <LoadingSpinner size="sm" /> : saved ? <Check className="w-4 h-4" /> : <Save className="w-4 h-4" />}
          {saved ? 'Saved!' : 'Save Configuration'}
        </button>
      </div>

      {Object.values(validationErrors).map((err, i) => (
        <p key={i} className="text-sm text-error-600 dark:text-error-400">{err}</p>
      ))}

      <Card>
        <CardHeader icon={Droplets} title="Physical Specifications" subtitle="Tank dimensions and capacity" />
        <div className="p-5 pt-0 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">Tank Capacity</label>
            <div className="flex gap-2">
              <input
                type="number"
                value={form.tank_capacity_liters}
                onChange={(e) => setForm({ ...form, tank_capacity_liters: parseFloat(e.target.value) || 0 })}
                disabled={isReadOnly}
                min={1}
                className="input flex-1"
              />
              <select
                value={form.measurement_unit}
                onChange={(e) => setForm({ ...form, measurement_unit: e.target.value as typeof form.measurement_unit })}
                disabled={isReadOnly}
                className="input w-32"
              >
                <option value="liters">Liters</option>
                <option value="cubic_meters">m³</option>
                <option value="gallons">Gallons</option>
              </select>
            </div>
          </div>
          <ThresholdInput label="Tank Height (meters)" value={form.tank_height_meters} onChange={(v) => setForm({ ...form, tank_height_meters: v })} disabled={isReadOnly} step={0.1} min={0.1} helpText="Physical tank height" />
        </div>
      </Card>

      <Card>
        <CardHeader icon={Gauge} title="Level Thresholds" subtitle="Water level monitoring thresholds" />
        <div className="p-5 pt-0 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <ThresholdInput label="Minimum Level (%)" value={form.tank_min_level} onChange={(v) => setForm({ ...form, tank_min_level: v })} disabled={isReadOnly} step={1} min={0} max={100} helpText="Pump shutoff threshold" />
          <ThresholdInput label="Maximum Level (%)" value={form.tank_max_level} onChange={(v) => setForm({ ...form, tank_max_level: v })} disabled={isReadOnly} step={1} min={0} max={100} helpText="Overflow prevention" />
          <ThresholdInput label="Warning Level (%)" value={form.tank_warning_level} onChange={(v) => setForm({ ...form, tank_warning_level: v })} disabled={isReadOnly} step={1} min={0} max={100} helpText="Early warning threshold" />
          <ThresholdInput label="Critical Level (%)" value={form.tank_critical_level} onChange={(v) => setForm({ ...form, tank_critical_level: v })} disabled={isReadOnly} step={1} min={0} max={100} helpText="Critical alert threshold" />
        </div>
      </Card>
    </div>
  );
}

// Sensor Configuration Section
function SensorConfigurationSection({ isReadOnly }: { isReadOnly: boolean }) {
  const { sensors, loading: sensorsLoading } = useSensors();
  const { calibrations, loading: calLoading, addCalibration } = useSensorCalibration();
  const [calibratingSensor, setCalibratingSensor] = useState<string | null>(null);

  if (sensorsLoading || calLoading) {
    return <div className="flex items-center justify-center h-64"><LoadingSpinner size="lg" /></div>;
  }

  const getLatestCalibration = (sensorId: string) => {
    return calibrations.find(c => c.sensor_id === sensorId);
  };

  const handleCalibrate = async (sensorId: string, offset: number, scale: number, notes?: string) => {
    const nextDate = new Date();
    nextDate.setMonth(nextDate.getMonth() + 6);
    await addCalibration(sensorId, offset, scale, notes, nextDate.toISOString());
    setCalibratingSensor(null);
  };

  const handleReconnect = async (sensorId: string) => {
    await supabase
      .from('sensors')
      .update({ network_status: 'online', last_communication: new Date().toISOString() })
      .eq('id', sensorId);
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader icon={Cpu} title="Connected Sensors" subtitle={`${sensors.length} sensors registered`} />
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-slate-200 dark:border-slate-800">
                <th className="text-left px-5 py-3 text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Sensor ID</th>
                <th className="text-left px-5 py-3 text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Type</th>
                <th className="text-left px-5 py-3 text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Location</th>
                <th className="text-left px-5 py-3 text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Status</th>
                <th className="text-left px-5 py-3 text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Last Communication</th>
                <th className="text-right px-5 py-3 text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {sensors.map(sensor => {
                const latestCal = getLatestCalibration(sensor.id);
                return (
                  <tr key={sensor.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/50">
                    <td className="px-5 py-4">
                      <span className="font-mono text-sm text-slate-900 dark:text-slate-100">{sensor.id}</span>
                    </td>
                    <td className="px-5 py-4">
                      <Badge variant={
                        sensor.sensor_type === 'pressure' ? 'info' :
                        sensor.sensor_type === 'tank_level' ? 'success' :
                        sensor.sensor_type === 'flow' ? 'warning' : 'neutral'
                      }>
                        {sensor.sensor_type.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase())}
                      </Badge>
                    </td>
                    <td className="px-5 py-4">
                      <span className="text-sm text-slate-700 dark:text-slate-300">{sensor.floor}{sensor.location ? ` - ${sensor.location}` : ''}</span>
                    </td>
                    <td className="px-5 py-4">
                      <div className="flex items-center gap-2">
                        <StatusDot status={sensor.network_status === 'online' ? 'online' : sensor.network_status === 'offline' ? 'offline' : 'warning'} />
                        <span className={`text-sm ${
                          sensor.network_status === 'online' ? 'text-success-600 dark:text-success-400' :
                          sensor.network_status === 'offline' ? 'text-error-600 dark:text-error-400' :
                          'text-warning-600 dark:text-warning-400'
                        }`}>
                          {sensor.network_status.charAt(0).toUpperCase() + sensor.network_status.slice(1)}
                        </span>
                      </div>
                    </td>
                    <td className="px-5 py-4">
                      <span className="text-sm text-slate-500 dark:text-slate-400">
                        {new Date(sensor.last_communication).toLocaleString()}
                      </span>
                      {latestCal && (
                        <p className="text-xs text-slate-400">Calibrated: {new Date(latestCal.calibration_date).toLocaleDateString()}</p>
                      )}
                    </td>
                    <td className="px-5 py-4">
                      <div className="flex items-center justify-end gap-2">
                        {!isReadOnly && (
                          <>
                            <button
                              onClick={() => setCalibratingSensor(calibratingSensor === sensor.id ? null : sensor.id)}
                              className="btn-ghost text-xs px-2 py-1.5"
                              title="Calibrate"
                            >
                              <Gauge className="w-4 h-4 mr-1" /> Calibrate
                            </button>
                            {sensor.network_status !== 'online' && (
                              <button
                                onClick={() => handleReconnect(sensor.id)}
                                className="btn-ghost text-xs px-2 py-1.5"
                                title="Reconnect"
                              >
                                <RefreshCw className="w-4 h-4 mr-1" /> Reconnect
                              </button>
                            )}
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </Card>

      {/* Calibration Modal */}
      {calibratingSensor && (
        <CalibrationModal
          sensorId={calibratingSensor}
          onClose={() => setCalibratingSensor(null)}
          onCalibrate={handleCalibrate}
        />
      )}
    </div>
  );
}

// Calibration Modal
function CalibrationModal({ sensorId, onClose, onCalibrate }: { sensorId: string; onClose: () => void; onCalibrate: (id: string, offset: number, scale: number, notes?: string) => void }) {
  const [offset, setOffset] = useState(0);
  const [scale, setScale] = useState(1);
  const [notes, setNotes] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    await onCalibrate(sensorId, offset, scale, notes);
    setLoading(false);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-sm">
      <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-xl w-full max-w-md mx-4">
        <div className="flex items-center justify-between p-5 border-b border-slate-200 dark:border-slate-800">
          <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-100">Calibrate Sensor</h3>
          <button onClick={onClose} className="btn-ghost p-2"><X className="w-5 h-5" /></button>
        </div>
        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          <p className="text-sm text-slate-500 dark:text-slate-400">Sensor: <span className="font-mono">{sensorId}</span></p>
          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">Calibration Offset</label>
            <input type="number" step="0.01" value={offset} onChange={(e) => setOffset(parseFloat(e.target.value) || 0)} className="input" />
            <p className="text-xs text-slate-400 mt-1">Value to add to raw reading</p>
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">Calibration Scale</label>
            <input type="number" step="0.01" value={scale} onChange={(e) => setScale(parseFloat(e.target.value) || 1)} className="input" />
            <p className="text-xs text-slate-400 mt-1">Multiplier for raw reading</p>
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">Notes (optional)</label>
            <textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={2} className="input" />
          </div>
          <div className="flex gap-3 pt-2">
            <button type="button" onClick={onClose} className="btn-secondary flex-1">Cancel</button>
            <button type="submit" disabled={loading} className="btn-primary flex-1">
              {loading ? <LoadingSpinner size="sm" /> : 'Apply Calibration'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// System Configuration Section
function SystemConfigurationSection({ isReadOnly }: { isReadOnly: boolean }) {
  const { profile } = useAuth();
  const { settings, loading, setSettings } = useSettings();
  const [form, setForm] = useState<SystemSettings | null>(null);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    if (settings) setForm(settings);
  }, [settings]);

  const handleSave = async () => {
    if (!form) return;
    setSaving(true);

    const { error } = await supabase
      .from('system_settings')
      .update({
        auto_refresh_interval: form.auto_refresh_interval,
        timezone: form.timezone,
        date_format: form.date_format,
        time_format: form.time_format,
        default_dashboard_view: form.default_dashboard_view,
        updated_at: new Date().toISOString(),
      })
      .eq('id', 1);

    if (!error) {
      if (profile) {
        await logAuditEvent(profile.email, 'Updated system configuration', 'settings_change', {});
      }
      setSettings(form);
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    }
    setSaving(false);
  };

  if (loading || !form) {
    return <div className="flex items-center justify-center h-64"><LoadingSpinner size="lg" /></div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-end">
        <button onClick={handleSave} disabled={saving || isReadOnly} className="btn-primary">
          {saving ? <LoadingSpinner size="sm" /> : saved ? <Check className="w-4 h-4" /> : <Save className="w-4 h-4" />}
          {saved ? 'Saved!' : 'Save Changes'}
        </button>
      </div>

      <Card>
        <CardHeader icon={Clock} title="Data Refresh" subtitle="Configure how often data updates" />
        <div className="p-5 pt-0">
          <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">Refresh Interval (seconds)</label>
          <input
            type="number"
            value={form.auto_refresh_interval}
            onChange={(e) => setForm({ ...form, auto_refresh_interval: parseInt(e.target.value) || 5 })}
            disabled={isReadOnly}
            min={1}
            max={60}
            className="input"
          />
          <p className="text-xs text-slate-400 mt-1.5">Recommended: 3-10 seconds for real-time monitoring</p>
        </div>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader icon={Globe} title="Timezone & Date Format" subtitle="Regional preferences" />
          <div className="p-5 pt-0 space-y-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">Timezone</label>
              <select
                value={form.timezone}
                onChange={(e) => setForm({ ...form, timezone: e.target.value })}
                disabled={isReadOnly}
                className="input"
              >
                <option value="UTC">UTC</option>
                <option value="America/New_York">Eastern Time (ET)</option>
                <option value="America/Chicago">Central Time (CT)</option>
                <option value="America/Denver">Mountain Time (MT)</option>
                <option value="America/Los_Angeles">Pacific Time (PT)</option>
                <option value="Europe/London">London (GMT)</option>
                <option value="Europe/Paris">Paris (CET)</option>
                <option value="Asia/Tokyo">Tokyo (JST)</option>
                <option value="Asia/Shanghai">Shanghai (CST)</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">Date Format</label>
              <select
                value={form.date_format}
                onChange={(e) => setForm({ ...form, date_format: e.target.value as typeof form.date_format })}
                disabled={isReadOnly}
                className="input"
              >
                <option value="MM/DD/YYYY">MM/DD/YYYY (US)</option>
                <option value="DD/MM/YYYY">DD/MM/YYYY (EU)</option>
                <option value="YYYY-MM-DD">YYYY-MM-DD (ISO)</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">Time Format</label>
              <select
                value={form.time_format}
                onChange={(e) => setForm({ ...form, time_format: e.target.value as typeof form.time_format })}
                disabled={isReadOnly}
                className="input"
              >
                <option value="12h">12-hour (AM/PM)</option>
                <option value="24h">24-hour</option>
              </select>
            </div>
          </div>
        </Card>

        <Card>
          <CardHeader icon={Eye} title="Dashboard Preferences" subtitle="Default view settings" />
          <div className="p-5 pt-0">
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">Default Dashboard View</label>
            <select
              value={form.default_dashboard_view}
              onChange={(e) => setForm({ ...form, default_dashboard_view: e.target.value as typeof form.default_dashboard_view })}
              disabled={isReadOnly}
              className="input"
            >
              <option value="overview">Overview (Summary Cards)</option>
              <option value="detailed">Detailed (Full Charts)</option>
              <option value="compact">Compact (Minimal UI)</option>
            </select>
          </div>
        </Card>
      </div>
    </div>
  );
}

// Appearance Section
function AppearanceSection({ isReadOnly }: { isReadOnly: boolean }) {
  const { theme, setTheme } = useTheme();
  const { settings, loading, setSettings } = useSettings();
  const [form, setForm] = useState<SystemSettings | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (settings) setForm(settings);
  }, [settings]);

  const handleThemeColorChange = async (color: string) => {
    if (!form || isReadOnly) return;
    setSaving(true);
    setForm({ ...form, theme_color: color as typeof form.theme_color });
    await supabase
      .from('system_settings')
      .update({ theme_color: color })
      .eq('id', 1);
    if (settings) setSettings({ ...form, theme_color: color as typeof form.theme_color });
    setSaving(false);
  };

  const themeColors = [
    { id: 'primary', label: 'Primary Blue', color: '#3b82f6' },
    { id: 'cyan', label: 'Cyan', color: '#06b6d4' },
    { id: 'emerald', label: 'Emerald', color: '#10b981' },
    { id: 'amber', label: 'Amber', color: '#f59e0b' },
  ];

  if (loading || !form) {
    return <div className="flex items-center justify-center h-64"><LoadingSpinner size="lg" /></div>;
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader icon={Palette} title="Theme Mode" subtitle="Choose light or dark mode" />
        <div className="p-5 pt-0">
          <div className="grid grid-cols-2 gap-3">
            <button
              onClick={() => !isReadOnly && setTheme('light')}
              className={`p-4 rounded-xl border-2 transition-all ${theme === 'light' ? 'border-primary-500 bg-primary-50 dark:bg-primary-950' : 'border-slate-200 dark:border-slate-800 hover:border-slate-300'}`}
              disabled={isReadOnly}
            >
              <div className="flex flex-col items-center gap-2">
                <Sun className={`w-8 h-8 ${theme === 'light' ? 'text-primary-500' : 'text-slate-400'}`} />
                <span className={`text-sm font-medium ${theme === 'light' ? 'text-primary-700 dark:text-primary-300' : 'text-slate-600 dark:text-slate-400'}`}>Light</span>
              </div>
            </button>
            <button
              onClick={() => !isReadOnly && setTheme('dark')}
              className={`p-4 rounded-xl border-2 transition-all ${theme === 'dark' ? 'border-primary-500 bg-primary-50 dark:bg-primary-950' : 'border-slate-200 dark:border-slate-800 hover:border-slate-300'}`}
              disabled={isReadOnly}
            >
              <div className="flex flex-col items-center gap-2">
                <Moon className={`w-8 h-8 ${theme === 'dark' ? 'text-primary-500' : 'text-slate-400'}`} />
                <span className={`text-sm font-medium ${theme === 'dark' ? 'text-primary-700 dark:text-primary-300' : 'text-slate-600 dark:text-slate-400'}`}>Dark</span>
              </div>
            </button>
          </div>
        </div>
      </Card>

      <Card>
        <CardHeader icon={Palette} title="Theme Color" subtitle="Select accent color for the interface" />
        <div className="p-5 pt-0">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {themeColors.map(tc => (
              <button
                key={tc.id}
                onClick={() => handleThemeColorChange(tc.id)}
                disabled={isReadOnly}
                className={`p-4 rounded-xl border-2 transition-all ${form.theme_color === tc.id ? 'border-slate-900 dark:border-white' : 'border-slate-200 dark:border-slate-800 hover:border-slate-300'}`}
              >
                <div className="flex flex-col items-center gap-2">
                  <div className="w-8 h-8 rounded-lg" style={{ backgroundColor: tc.color }} />
                  <span className={`text-xs font-medium ${form.theme_color === tc.id ? 'text-slate-900 dark:text-white' : 'text-slate-600 dark:text-slate-400'}`}>{tc.label}</span>
                </div>
              </button>
            ))}
          </div>
        </div>
      </Card>
    </div>
  );
}

// Security Section
function SecuritySection({ isReadOnly }: { isReadOnly: boolean }) {
  const { profile } = useAuth();
  const { settings, loading, setSettings } = useSettings();
  const { activities, loading: activityLoading } = useLoginActivity(10);
  const { logs } = useAuditLogs(20);
  const [form, setForm] = useState<SystemSettings | null>(null);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [showChangePassword, setShowChangePassword] = useState(false);

  useEffect(() => {
    if (settings) setForm(settings);
  }, [settings]);

  const handleSave = async () => {
    if (!form) return;
    setSaving(true);
    const { error } = await supabase
      .from('system_settings')
      .update({
        session_timeout_minutes: form.session_timeout_minutes,
        two_factor_enabled: form.two_factor_enabled,
        updated_at: new Date().toISOString(),
      })
      .eq('id', 1);

    if (!error) {
      setSettings(form);
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    }
    setSaving(false);
  };

  if (loading || !form) {
    return <div className="flex items-center justify-center h-64"><LoadingSpinner size="lg" /></div>;
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader
          icon={Shield}
          title="System Security"
          subtitle="Configure security settings"
          action={
            <button onClick={handleSave} disabled={saving || isReadOnly} className="btn-primary text-sm">
              {saving ? <LoadingSpinner size="sm" /> : saved ? <Check className="w-4 h-4" /> : <Save className="w-4 h-4" />}
              {saved ? 'Saved!' : 'Save'}
            </button>
          }
        />
        <div className="p-5 pt-0 space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">Session Timeout (minutes)</label>
            <input
              type="number"
              value={form.session_timeout_minutes}
              onChange={(e) => setForm({ ...form, session_timeout_minutes: parseInt(e.target.value) || 30 })}
              disabled={isReadOnly}
              min={5}
              max={1440}
              className="input"
            />
            <p className="text-xs text-slate-400 mt-1.5">Users will be logged out after this period of inactivity</p>
          </div>
          <ToggleRow
            label="Two-Factor Authentication"
            description="Require 2FA for all user logins (requires setup)"
            checked={form.two_factor_enabled}
            onChange={(v) => setForm({ ...form, two_factor_enabled: v })}
            disabled={isReadOnly}
          />
        </div>
      </Card>

      <Card>
        <CardHeader icon={Key} title="Password" subtitle="Change your account password" />
        <div className="p-5 pt-0">
          <button onClick={() => setShowChangePassword(true)} className="btn-secondary" disabled={isReadOnly}>
            Change Password
          </button>
        </div>
      </Card>

      <Card>
        <CardHeader icon={Activity} title="Recent Login Activity" subtitle="Your recent login history" />
        <div className="p-5 pt-0">
          {activityLoading ? (
            <div className="flex justify-center py-4"><LoadingSpinner size="sm" /></div>
          ) : activities.length === 0 ? (
            <p className="text-sm text-slate-500 dark:text-slate-400">No login activity recorded</p>
          ) : (
            <div className="space-y-3">
              {activities.map(activity => (
                <div key={activity.id} className="flex items-center justify-between p-3 rounded-lg bg-slate-50 dark:bg-slate-800/50">
                  <div>
                    <p className="text-sm font-medium text-slate-900 dark:text-slate-100">
                      {new Date(activity.login_time).toLocaleString()}
                    </p>
                    <p className="text-xs text-slate-500 dark:text-slate-400">
                      {activity.ip_address || 'Unknown IP'} • {activity.device_type || 'Unknown device'}
                    </p>
                  </div>
                  {activity.logout_time ? (
                    <span className="text-xs text-slate-500">Session ended</span>
                  ) : (
                    <Badge variant="success">Active</Badge>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </Card>

      {/* Change Password Modal */}
      {showChangePassword && <ChangePasswordModal onClose={() => setShowChangePassword(false)} />}
    </div>
  );
}

// Change Password Modal
function ChangePasswordModal({ onClose }: { onClose: () => void }) {
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newPassword !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }
    setLoading(true);
    setError('');

    const { error: updateError } = await supabase.auth.updateUser({
      password: newPassword,
    });

    if (updateError) {
      setError(updateError.message);
    } else {
      setSuccess(true);
      setTimeout(onClose, 1500);
    }
    setLoading(false);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-sm">
      <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-xl w-full max-w-md mx-4">
        <div className="flex items-center justify-between p-5 border-b border-slate-200 dark:border-slate-800">
          <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-100">Change Password</h3>
          <button onClick={onClose} className="btn-ghost p-2"><X className="w-5 h-5" /></button>
        </div>
        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          {error && <p className="text-sm text-error-600 dark:text-error-400">{error}</p>}
          {success && <p className="text-sm text-success-600 dark:text-success-400">Password updated successfully!</p>}
          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">New Password</label>
            <input type="password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} required minLength={6} className="input" />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">Confirm New Password</label>
            <input type="password" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} required minLength={6} className="input" />
          </div>
          <div className="flex gap-3 pt-2">
            <button type="button" onClick={onClose} className="btn-secondary flex-1">Cancel</button>
            <button type="submit" disabled={loading} className="btn-primary flex-1">
              {loading ? <LoadingSpinner size="sm" /> : 'Update Password'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// Helper Components
function CollapsibleCard({
  title,
  subtitle,
  icon,
  expanded,
  onToggle,
  children,
  error,
}: {
  title: string;
  subtitle?: string;
  icon: typeof Gauge;
  expanded: boolean;
  onToggle: () => void;
  children: React.ReactNode;
  error?: string;
}) {
  return (
    <Card className={error ? 'border-error-200 dark:border-error-900' : ''}>
      <button onClick={onToggle} className="w-full flex items-center justify-between p-5 text-left">
        <CardHeader icon={icon} title={title} subtitle={subtitle} />
        {expanded ? <ChevronDown className="w-5 h-5 text-slate-400" /> : <ChevronRight className="w-5 h-5 text-slate-400" />}
      </button>
      {expanded && <div className="px-5 pb-5">{children}</div>}
    </Card>
  );
}

function ThresholdInput({
  label,
  value,
  onChange,
  disabled,
  step,
  min,
  max,
  helpText,
}: {
  label: string;
  value: number;
  onChange: (v: number) => void;
  disabled: boolean;
  step: number;
  min?: number;
  max?: number;
  helpText?: string;
}) {
  return (
    <div>
      <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">{label}</label>
      <input
        type="number"
        value={value}
        onChange={(e) => onChange(parseFloat(e.target.value) || 0)}
        disabled={disabled}
        step={step}
        min={min}
        max={max}
        className="input disabled:opacity-60"
      />
      {helpText && <p className="text-xs text-slate-400 mt-1.5">{helpText}</p>}
    </div>
  );
}

function ToggleRow({
  label,
  description,
  checked,
  onChange,
  disabled,
}: {
  label: string;
  description: string;
  checked: boolean;
  onChange: (v: boolean) => void;
  disabled?: boolean;
}) {
  return (
    <div className="flex items-center justify-between p-3 rounded-xl bg-slate-50 dark:bg-slate-800/50">
      <div>
        <p className="text-sm font-medium text-slate-900 dark:text-slate-100">{label}</p>
        <p className="text-xs text-slate-500 dark:text-slate-400">{description}</p>
      </div>
      <button
        onClick={() => onChange(!checked)}
        disabled={disabled}
        className={`relative w-11 h-6 rounded-full transition-colors ${checked ? 'bg-primary-600' : 'bg-slate-300 dark:bg-slate-700'} ${disabled ? 'opacity-50 cursor-not-allowed' : ''}`}
      >
        <span className={`absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-white transition-transform ${checked ? 'translate-x-5' : ''}`} />
      </button>
    </div>
  );
}
