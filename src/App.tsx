import { useState } from 'react';
import { AuthProvider } from './context/AuthContext';
import { ThemeProvider } from './context/ThemeContext';
import { ChatbotProvider } from './context/ChatbotContext';
import { AppShell } from './components/AppShell';
import { AquaChatbot } from './components/AquaChatbot';
import { DashboardPage } from './pages/DashboardPage';
import { LiveMonitoringPage } from './pages/LiveMonitoringPage';
import { HistoricalLogsPage } from './pages/HistoricalLogsPage';
import { AlertsPage } from './pages/AlertsPage';
import { SettingsPage } from './pages/SettingsPage';
import { LoginScreen } from './pages/LoginScreen';
import { useAuth } from './context/AuthContext';
import type { PageId } from './components/AppShell';

function AppContent() {
  const { user, loading } = useAuth();
  const [currentPage, setCurrentPage] = useState<PageId>('dashboard');

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-slate-950">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-500"></div>
      </div>
    );
  }

  if (!user) {
    return <LoginScreen />;
  }

  const renderPage = () => {
    switch (currentPage) {
      case 'dashboard':
        return <DashboardPage />;
      case 'realtime':
        return <LiveMonitoringPage />;
      case 'historical':
        return <HistoricalLogsPage />;
      case 'alerts':
        return <AlertsPage />;
      case 'settings':
        return <SettingsPage />;
      default:
        return <DashboardPage />;
    }
  };

  return (
    <>
      <AppShell currentPage={currentPage} onNavigate={setCurrentPage}>
        {renderPage()}
      </AppShell>
      <AquaChatbot />
    </>
  );
}

function App() {
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

export default App;
