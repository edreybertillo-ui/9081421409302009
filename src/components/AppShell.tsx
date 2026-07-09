import { useState, type ReactNode, useMemo } from 'react';
import {
  LayoutDashboard, Radio, History, Bell, Settings, LogOut, Droplets, Menu,
  Moon, Sun, Shield, AlertTriangle, ChevronDown, Cpu, Building2, Wifi, WifiOff, Activity
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { ROLE_LABELS, FLOORS } from '../types';
import { Badge, StatusDot } from './ui';
import { useAlerts, useSensors } from '../hooks/useData';

export type PageId = 'dashboard' | 'realtime' | 'historical' | 'alerts' | 'settings';

interface NavItem {
  id: PageId;
  label: string;
  icon: typeof LayoutDashboard;
}

const NAV_ITEMS: NavItem[] = [
  { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { id: 'realtime', label: 'Real-Time Monitoring', icon: Radio },
  { id: 'historical', label: 'Historical Data', icon: History },
  { id: 'alerts', label: 'Alerts', icon: Bell },
  { id: 'settings', label: 'Settings', icon: Settings },
];

export function AppShell({ currentPage, onNavigate, children }: { currentPage: PageId; onNavigate: (p: PageId) => void; children: ReactNode }) {
  const { profile, signOut } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const { alerts } = useAlerts();
  const { sensors } = useSensors();
  const activeAlertCount = alerts.filter((a) => a.status === 'active').length;

  const role = profile?.role;

  const sensorStatus = useMemo(() => {
    const online = sensors.filter(s => s.network_status === 'online').length;
    const offline = sensors.filter(s => s.network_status === 'offline').length;
    const criticalBattery = sensors.filter(s => s.battery_status === 'critical').length;
    return { online, offline, criticalBattery, total: sensors.length };
  }, [sensors]);

  const floorStatus = useMemo(() => {
    return FLOORS.map(floor => {
      const floorSensors = sensors.filter(s => s.floor === floor);
      const hasOffline = floorSensors.some(s => s.network_status === 'offline');
      const hasDegraded = floorSensors.some(s => s.network_status === 'degraded');
      const activeAlerts = alerts.filter(a => a.floor === floor && a.status === 'active').length;
      return {
        floor,
        sensorCount: floorSensors.length,
        status: hasOffline ? 'offline' : hasDegraded ? 'degraded' : 'online',
        activeAlerts
      };
    });
  }, [sensors, alerts]);

  const handleNavigate = (p: PageId) => {
    onNavigate(p);
    setSidebarOpen(false);
  };

  return (
    <div className="min-h-screen flex bg-slate-50 dark:bg-slate-950">
      <aside className="hidden lg:flex w-64 flex-col fixed inset-y-0 left-0 bg-white dark:bg-slate-900 border-r border-slate-200 dark:border-slate-800 z-30">
        <SidebarContent
          currentPage={currentPage}
          onNavigate={handleNavigate}
          activeAlertCount={activeAlertCount}
          sensorStatus={sensorStatus}
          floorStatus={floorStatus}
        />
      </aside>

      {sidebarOpen && (
        <>
          <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-40 lg:hidden" onClick={() => setSidebarOpen(false)} />
          <aside className="fixed inset-y-0 left-0 w-64 bg-white dark:bg-slate-900 border-r border-slate-200 dark:border-slate-800 z-50 lg:hidden animate-slide-in">
            <SidebarContent
              currentPage={currentPage}
              onNavigate={handleNavigate}
              activeAlertCount={activeAlertCount}
              sensorStatus={sensorStatus}
              floorStatus={floorStatus}
            />
          </aside>
        </>
      )}

      <div className="flex-1 lg:ml-64 flex flex-col min-h-screen">
        <header className="sticky top-0 z-20 bg-white/80 dark:bg-slate-900/80 backdrop-blur-md border-b border-slate-200 dark:border-slate-800">
          <div className="flex items-center justify-between px-4 lg:px-8 h-16">
            <div className="flex items-center gap-3">
              <button onClick={() => setSidebarOpen(true)} className="lg:hidden btn-ghost p-2">
                <Menu className="w-5 h-5" />
              </button>
              <div className="hidden sm:flex items-center gap-2">
                <StatusDot status="online" />
                <span className="text-sm font-medium text-slate-600 dark:text-slate-400">System Online</span>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button onClick={toggleTheme} className="btn-ghost p-2.5" title="Toggle theme">
                {theme === 'light' ? <Moon className="w-4.5 h-4.5" /> : <Sun className="w-4.5 h-4.5" />}
              </button>

              <button onClick={() => handleNavigate('alerts')} className="btn-ghost p-2.5 relative" title="Notifications">
                <Bell className="w-4.5 h-4.5" />
                {activeAlertCount > 0 && (
                  <span className="absolute top-1 right-1 min-w-[18px] h-[18px] px-1 rounded-full bg-error-500 text-white text-[10px] font-bold flex items-center justify-center">
                    {activeAlertCount}
                  </span>
                )}
              </button>

              <div className="relative">
                <button
                  onClick={() => setUserMenuOpen(!userMenuOpen)}
                  className="flex items-center gap-2.5 pl-2 pr-3 py-1.5 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                >
                  <div className="w-8 h-8 rounded-lg bg-primary-100 dark:bg-primary-900 flex items-center justify-center">
                    <span className="text-sm font-semibold text-primary-700 dark:text-primary-300">
                      {profile?.full_name?.charAt(0).toUpperCase() || 'U'}
                    </span>
                  </div>
                  <div className="hidden sm:block text-left">
                    <p className="text-sm font-medium text-slate-900 dark:text-slate-100 leading-tight">{profile?.full_name}</p>
                    <p className="text-xs text-slate-500 dark:text-slate-400">{role ? ROLE_LABELS[role] : ''}</p>
                  </div>
                  <ChevronDown className="w-4 h-4 text-slate-400 hidden sm:block" />
                </button>

                {userMenuOpen && (
                  <>
                    <div className="fixed inset-0 z-10" onClick={() => setUserMenuOpen(false)} />
                    <div className="absolute right-0 top-full mt-2 w-56 card p-2 z-20 animate-slide-up">
                      <div className="px-3 py-2 border-b border-slate-100 dark:border-slate-800 mb-1">
                        <p className="text-sm font-medium text-slate-900 dark:text-slate-100">{profile?.full_name}</p>
                        <p className="text-xs text-slate-500 dark:text-slate-400">{profile?.email}</p>
                        <div className="mt-1.5">
                          <Badge variant="info">{role ? ROLE_LABELS[role] : ''}</Badge>
                        </div>
                      </div>
                      <button onClick={() => { handleNavigate('settings'); setUserMenuOpen(false); }} className="nav-item nav-item-inactive w-full">
                        <Settings className="w-4 h-4" /> Settings
                      </button>
                      <div className="border-t border-slate-100 dark:border-slate-800 mt-1 pt-1">
                        <button onClick={signOut} className="nav-item nav-item-inactive w-full text-error-600 dark:text-error-400 hover:bg-error-50 dark:hover:bg-error-950">
                          <LogOut className="w-4 h-4" /> Sign Out
                        </button>
                      </div>
                    </div>
                  </>
                )}
              </div>
            </div>
          </div>

          {false && (
            <div className="px-4 lg:px-8 py-2 bg-warning-50 dark:bg-warning-950/50 border-t border-warning-200 dark:border-warning-900 flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-warning-600 dark:text-warning-400" />
              <span className="text-sm text-warning-700 dark:text-warning-400">Emergency mode active</span>
            </div>
          )}
        </header>

        <main className="flex-1 p-4 lg:p-8 max-w-7xl mx-auto w-full">
          {children}
        </main>
      </div>
    </div>
  );
}

function SidebarContent({
  currentPage,
  onNavigate,
  activeAlertCount,
  sensorStatus,
  floorStatus,
}: {
  currentPage: PageId;
  onNavigate: (p: PageId) => void;
  activeAlertCount: number;
  sensorStatus: { online: number; offline: number; criticalBattery: number; total: number };
  floorStatus: Array<{ floor: string; sensorCount: number; status: string; activeAlerts: number }>;
}) {
  const { signOut } = useAuth();
  const [showSensors, setShowSensors] = useState(false);
  const [showFloors, setShowFloors] = useState(false);

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center gap-3 px-5 h-16 border-b border-slate-200 dark:border-slate-800">
        <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-primary-500 to-cyan-500 flex items-center justify-center">
          <Droplets className="w-5 h-5 text-white" />
        </div>
        <div>
          <h1 className="text-sm font-bold text-slate-900 dark:text-slate-100 leading-tight">Water Monitor</h1>
          <p className="text-[10px] text-slate-500 dark:text-slate-400">Digital Platform</p>
        </div>
      </div>

      <nav className="flex-1 p-3 space-y-1 overflow-y-auto">
        {NAV_ITEMS.map((item) => {
          const isActive = currentPage === item.id;
          return (
            <button
              key={item.id}
              onClick={() => onNavigate(item.id)}
              className={`nav-item w-full ${isActive ? 'nav-item-active' : 'nav-item-inactive'}`}
            >
              <item.icon className="w-4.5 h-4.5 flex-shrink-0" />
              <span className="flex-1 text-left">{item.label}</span>
              {item.id === 'alerts' && activeAlertCount > 0 && (
                <span className="min-w-[20px] h-5 px-1.5 rounded-lg bg-error-500 text-white text-[10px] font-bold flex items-center justify-center">
                  {activeAlertCount}
                </span>
              )}
            </button>
          );
        })}

        <div className="pt-3 mt-3 border-t border-slate-200 dark:border-slate-800">
          <button
            onClick={() => setShowSensors(!showSensors)}
            className="w-full flex items-center justify-between px-1 py-2 text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider hover:text-slate-700 dark:hover:text-slate-300 transition-colors"
          >
            <span className="flex items-center gap-2">
              <Cpu className="w-3.5 h-3.5" />
              Sensors
            </span>
            <ChevronDown className={`w-3.5 h-3.5 transition-transform duration-200 ${showSensors ? 'rotate-180' : ''}`} />
          </button>

          {showSensors && (
            <div className="mt-2 space-y-2 px-1 animate-slide-down">
              <div className="grid grid-cols-2 gap-2">
                <div className="p-2.5 rounded-lg bg-success-50 dark:bg-success-950/50 border border-success-100 dark:border-success-900">
                  <div className="flex items-center gap-1.5 mb-1">
                    <Wifi className="w-3 h-3 text-success-600 dark:text-success-400" />
                    <span className="text-[10px] font-medium text-success-700 dark:text-success-400">Online</span>
                  </div>
                  <p className="text-lg font-bold text-success-700 dark:text-success-300">{sensorStatus.online}</p>
                </div>
                <div className="p-2.5 rounded-lg bg-error-50 dark:bg-error-950/50 border border-error-100 dark:border-error-900">
                  <div className="flex items-center gap-1.5 mb-1">
                    <WifiOff className="w-3 h-3 text-error-600 dark:text-error-400" />
                    <span className="text-[10px] font-medium text-error-700 dark:text-error-400">Offline</span>
                  </div>
                  <p className="text-lg font-bold text-error-700 dark:text-error-300">{sensorStatus.offline}</p>
                </div>
              </div>
              {sensorStatus.criticalBattery > 0 && (
                <div className="p-2 rounded-lg bg-warning-50 dark:bg-warning-950/50 border border-warning-200 dark:border-warning-900 flex items-center gap-2">
                  <Activity className="w-3.5 h-3.5 text-warning-600 dark:text-warning-400" />
                  <span className="text-xs text-warning-700 dark:text-warning-400 font-medium">
                    {sensorStatus.criticalBattery} critical battery
                  </span>
                </div>
              )}
              <p className="text-[10px] text-slate-400 px-1">{sensorStatus.total} total sensors</p>
            </div>
          )}
        </div>

        <div className="pt-2">
          <button
            onClick={() => setShowFloors(!showFloors)}
            className="w-full flex items-center justify-between px-1 py-2 text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider hover:text-slate-700 dark:hover:text-slate-300 transition-colors"
          >
            <span className="flex items-center gap-2">
              <Building2 className="w-3.5 h-3.5" />
              Floors
            </span>
            <ChevronDown className={`w-3.5 h-3.5 transition-transform duration-200 ${showFloors ? 'rotate-180' : ''}`} />
          </button>

          {showFloors && (
            <div className="mt-2 space-y-1 px-1 animate-slide-down">
              {floorStatus.map((floor) => (
                <div
                  key={floor.floor}
                  className={`flex items-center justify-between p-2 rounded-lg transition-colors ${
                    floor.status === 'offline'
                      ? 'bg-error-50 dark:bg-error-950/30'
                      : floor.status === 'degraded'
                      ? 'bg-warning-50 dark:bg-warning-950/30'
                      : 'bg-slate-50 dark:bg-slate-800/50'
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <StatusDot status={floor.status === 'offline' ? 'offline' : floor.status === 'degraded' ? 'warning' : 'online'} />
                    <span className="text-xs font-medium text-slate-700 dark:text-slate-300">{floor.floor}</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    {floor.activeAlerts > 0 && (
                      <span className="min-w-[16px] h-4 px-1 rounded bg-error-500 text-white text-[9px] font-bold flex items-center justify-center">
                        {floor.activeAlerts}
                      </span>
                    )}
                    <span className="text-[10px] text-slate-400">{floor.sensorCount}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </nav>

      <div className="p-3 border-t border-slate-200 dark:border-slate-800">
        <div className="flex items-center gap-2 px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800/50">
          <Shield className="w-4 h-4 text-success-500" />
          <span className="text-xs text-slate-500 dark:text-slate-400">Secure Connection</span>
        </div>
        <button onClick={signOut} className="nav-item nav-item-inactive w-full mt-2 text-error-600 dark:text-error-400 hover:bg-error-50 dark:hover:bg-error-950">
          <LogOut className="w-4 h-4" /> Sign Out
        </button>
      </div>
    </div>
  );
}
