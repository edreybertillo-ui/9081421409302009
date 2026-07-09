import { useState } from 'react';
import { AuthProvider, useAuth } from './context/AuthContext';
import { ThemeProvider } from './context/ThemeContext';
import { ChatbotProvider, useChatbot } from './context/ChatbotContext';
import { LoginScreen } from './pages/LoginScreen';
import { AppShell, type PageId } from './components/AppShell';
import { DashboardPage } from './pages/DashboardPage';
import { LiveMonitoringPage } from './pages/LiveMonitoringPage';
import { HistoricalLogsPage } from './pages/HistoricalLogsPage';
import { AlertsPage } from './pages/AlertsPage';
import { SettingsPage } from './pages/SettingsPage';
import { LoadingSpinner } from './components/ui';
import { AquaChatbot } from './components/AquaChatbot';

function AppContent() {
  const { session, profile, loading } = useAuth();
  const [page, setPage] = useState<PageId>('dashboard');
  const { isOpen: chatbotOpen } = useChatbot();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-slate-950">
        <div className="text-center">
          <LoadingSpinner size="lg" />
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-4">Loading monitoring system...</p>
        </div>
      </div>
    );
  }

  if (!session || !profile) {
    return <LoginScreen />;
  }

  const pages: Record<PageId, React.ReactNode> = {
    dashboard: <DashboardPage />,
    realtime: <LiveMonitoringPage />,
    historical: <HistoricalLogsPage />,
    alerts: <AlertsPage />,
    settings: <SettingsPage />,
  };

  return (
    <div className="flex min-h-screen">
      <div className={`flex-1 transition-all duration-300 ease-in-out ${chatbotOpen ? 'lg:mr-[420px]' : ''}`}>
        <AppShell currentPage={page} onNavigate={setPage}>
          {pages[page]}
        </AppShell>
      </div>
      <AquaChatbot />
    </div>
  );
}

export default function App() {
  return (
    <ThemeProvider>
      <AuthProvider>
        <ChatbotProvider>
          <AppContent />
        </ChatbotProvider>
      </AuthProvider>
    </ThemeProvider>
  );
}
