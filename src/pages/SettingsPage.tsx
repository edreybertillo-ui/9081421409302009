import { useState } from 'react';
import { Save, User, Bell, Database } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useSettings } from '../hooks/useData';
import { Card, Button, Input, Badge, Tabs } from '../components/ui';

export function SettingsPage() {
  const { profile } = useAuth();
  const { settings, loading } = useSettings();
  const [activeTab, setActiveTab] = useState('profile');
  const [saving, setSaving] = useState(false);

  const [profileForm, setProfileForm] = useState({
    fullName: profile?.full_name || '',
    department: profile?.department || '',
  });

  const tabs = [
    { id: 'profile', label: 'Profile' },
    { id: 'notifications', label: 'Notifications' },
    { id: 'system', label: 'System' },
  ];

  const handleSaveProfile = async () => {
    setSaving(true);
    await new Promise((r) => setTimeout(r, 1000));
    setSaving(false);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[50vh]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-500"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-4xl">
      <div>
        <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100">Settings</h1>
        <p className="text-slate-500 dark:text-slate-400">Manage your account and system preferences</p>
      </div>

      <Tabs tabs={tabs} activeTab={activeTab} onChange={setActiveTab} />

      {activeTab === 'profile' && (
        <Card className="p-6">
          <div className="flex items-center gap-3 mb-6">
            <div className="p-2 rounded-lg bg-primary-100 dark:bg-primary-900">
              <User className="w-5 h-5 text-primary-600 dark:text-primary-400" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-100">Profile Settings</h2>
              <p className="text-sm text-slate-500">Update your personal information</p>
            </div>
          </div>

          <div className="space-y-4">
            <Input
              label="Full Name"
              value={profileForm.fullName}
              onChange={(v) => setProfileForm({ ...profileForm, fullName: v })}
              placeholder="Enter your full name"
            />

            <Input
              label="Email"
              value={profile?.email || ''}
              onChange={() => {}}
              disabled
            />

            <Input
              label="Department"
              value={profileForm.department}
              onChange={(v) => setProfileForm({ ...profileForm, department: v })}
              placeholder="Enter your department"
            />

            <div className="flex items-center gap-2">
              <Badge variant="info">{profile?.role}</Badge>
            </div>

            <div className="pt-4">
              <Button onClick={handleSaveProfile} disabled={saving}>
                <Save className="w-4 h-4" />
                {saving ? 'Saving...' : 'Save Changes'}
              </Button>
            </div>
          </div>
        </Card>
      )}

      {activeTab === 'notifications' && (
        <Card className="p-6">
          <div className="flex items-center gap-3 mb-6">
            <div className="p-2 rounded-lg bg-warning-100 dark:bg-warning-900">
              <Bell className="w-5 h-5 text-warning-600 dark:text-warning-400" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-100">Notification Preferences</h2>
              <p className="text-sm text-slate-500">Configure how you receive alerts</p>
            </div>
          </div>

          <div className="space-y-4">
            <NotificationSetting
              title="Email Notifications"
              description="Receive alert notifications via email"
              enabled={true}
            />
            <NotificationSetting
              title="Critical Alerts"
              description="Immediate notification for critical system alerts"
              enabled={true}
            />
            <NotificationSetting
              title="Daily Summary"
              description="Daily digest of system status and events"
              enabled={false}
            />
            <NotificationSetting
              title="Sensor Offline Alerts"
              description="Notify when sensors go offline"
              enabled={true}
            />
          </div>
        </Card>
      )}

      {activeTab === 'system' && (
        <Card className="p-6">
          <div className="flex items-center gap-3 mb-6">
            <div className="p-2 rounded-lg bg-slate-100 dark:bg-slate-800">
              <Database className="w-5 h-5 text-slate-600 dark:text-slate-400" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-100">System Configuration</h2>
              <p className="text-sm text-slate-500">View system settings and parameters</p>
            </div>
          </div>

          {settings && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <SettingItem label="Institution Name" value={settings.institution_name} />
                <SettingItem label="Auto Refresh" value={`${settings.auto_refresh_interval}s`} />
                <SettingItem label="Pressure Min" value={`${settings.pressure_min} PSI`} />
                <SettingItem label="Pressure Max" value={`${settings.pressure_max} PSI`} />
                <SettingItem label="Tank Critical Level" value={`${settings.tank_critical_level}%`} />
                <SettingItem label="Tank Low Level" value={`${settings.tank_low_level}%`} />
                <SettingItem label="Tank Capacity" value={`${settings.tank_capacity_liters} L`} />
                <SettingItem label="Timezone" value={settings.timezone} />
                <SettingItem label="Theme" value={settings.theme_color} />
                <SettingItem label="Session Timeout" value={`${settings.session_timeout_minutes} min`} />
              </div>

              <div className="pt-4 border-t border-slate-200 dark:border-slate-800">
                <Badge variant={settings.emergency_mode ? 'error' : 'success'}>
                  {settings.emergency_mode ? 'Emergency Mode Active' : 'Normal Operation'}
                </Badge>
              </div>
            </div>
          )}
        </Card>
      )}
    </div>
  );
}

function SettingItem({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="p-3 rounded-lg bg-slate-50 dark:bg-slate-800/50">
      <p className="text-xs text-slate-500">{label}</p>
      <p className="text-sm font-medium text-slate-900 dark:text-slate-100">{value}</p>
    </div>
  );
}

function NotificationSetting({ title, description, enabled }: { title: string; description: string; enabled: boolean }) {
  const [isEnabled, setIsEnabled] = useState(enabled);

  return (
    <div className="flex items-center justify-between p-4 rounded-lg bg-slate-50 dark:bg-slate-800/50">
      <div>
        <p className="text-sm font-medium text-slate-900 dark:text-slate-100">{title}</p>
        <p className="text-xs text-slate-500">{description}</p>
      </div>
      <button
        onClick={() => setIsEnabled(!isEnabled)}
        className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
          isEnabled ? 'bg-primary-500' : 'bg-slate-300 dark:bg-slate-700'
        }`}
      >
        <span
          className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
            isEnabled ? 'translate-x-6' : 'translate-x-1'
          }`}
        />
      </button>
    </div>
  );
}
