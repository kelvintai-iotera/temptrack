import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, useLocation, useNavigate } from 'react-router-dom';
import axios, { configureAxios } from './api/axiosSetup';
import { Dashboard } from './components/Dashboard';
import { RealTimeStatus } from './components/RealTimeStatus';
import { Login } from './components/Login';
import { Settings } from './components/Settings';
import { Alerts } from './components/Alerts';
import { History } from './components/History';
import { ConnectionBanner } from './components/ConnectionBanner';
import { UserAvatar } from './components/UserAvatar';
import { BeaconProvider } from './context/BeaconContext';
import { SettingsProvider, useSettings } from './context/SettingsContext';
import { countTempAlerts } from './utils/tempAlerts';
import { useBeacons } from './hooks/useBeacons';
import {
  LayoutDashboard,
  History as HistoryIcon,
  Settings as SettingsIcon,
  Bell,
  LogOut,
  Radio,
  Menu,
  X,
  ChevronDown,
} from 'lucide-react';
import { getSettingsSections, getSettingsPageTitle, getSettingsSubPath, settingsSectionPath, SETTINGS_DEFAULT_PATH } from './utils/settingsNav';

const TAB_TITLE_MAP = {
  dashboard: 'Dashboard',
  'real-time': 'Real Time Status',
  history: 'History',
  alerts: 'Temperature Alerts',
  settings: 'Settings',
};

function AppContent() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [now, setNow] = useState(() => new Date());
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();

  useEffect(() => {
    configureAxios({
      onUnauthorized: () => {
        setUser(null);
        if (location.pathname !== '/login') {
          navigate('/login', { replace: true });
        }
      },
    });
  }, [location.pathname, navigate]);

  useEffect(() => {
    axios.get('/auth/me')
      .then((res) => setUser(res.data))
      .catch(() => setUser(null))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(id);
  }, []);

  useEffect(() => {
    setMobileNavOpen(false);
  }, [location.pathname]);

  const handleLogout = async () => {
    try {
      await axios.post('/auth/logout');
      setUser(null);
      navigate('/login');
    } catch (err) {
      console.error('Logout failed', err);
      setUser(null);
      navigate('/login');
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-4 bg-background text-foreground">
        <div className="w-12 h-12 rounded-xl accent-gradient flex items-center justify-center">
          <RadioIcon />
        </div>
        <div className="w-8 h-8 border-2 border-accent-cyan border-t-transparent rounded-full animate-spin" />
        <p className="text-sm text-muted">Loading…</p>
      </div>
    );
  }

  if (!user && location.pathname !== '/login') {
    return <Navigate to="/login" replace />;
  }

  if (location.pathname === '/login') {
    return user ? <Navigate to="/" replace /> : <Login onLogin={setUser} />;
  }

  const path = location.pathname.replace(/^\//, '');
  const activeTab = path === '' ? 'dashboard' : path.split('/')[0];
  const isAdmin = user?.role === 'admin';
  const activeTitle = activeTab === 'settings'
    ? getSettingsPageTitle(location.pathname, isAdmin)
    : (TAB_TITLE_MAP[activeTab] || 'Page Not Found');

  return (
    <SettingsProvider>
      <BeaconProvider>
        <div className="min-h-screen flex flex-col md:flex-row bg-background text-foreground">
          <aside className="hidden md:flex w-64 shrink-0 border-r border-border flex-col h-screen sticky top-0 bg-card overflow-hidden p-6">
            <SidebarNav
              activeTab={activeTab}
              location={location}
              navigate={navigate}
              onLogout={handleLogout}
              onCloseMobile={() => setMobileNavOpen(false)}
              user={user}
            />
          </aside>

          {mobileNavOpen && (
            <>
              <button
                type="button"
                className="fixed inset-0 z-40 bg-black/40 md:hidden"
                aria-label="Close menu"
                onClick={() => setMobileNavOpen(false)}
              />
              <aside className="fixed inset-y-0 left-0 z-50 w-72 max-w-[85vw] border-r border-border flex flex-col bg-card md:hidden shadow-xl overflow-hidden">
                <div className="shrink-0 flex items-center justify-between p-6 pb-4">
                  <BrandMark />
                  <button
                    type="button"
                    onClick={() => setMobileNavOpen(false)}
                    className="p-2 text-muted hover:text-foreground rounded-lg hover:bg-[var(--color-panel-hover)]"
                    aria-label="Close menu"
                  >
                    <X size={22} />
                  </button>
                </div>
                <div className="flex-1 min-h-0 px-6 pb-6">
                <SidebarNav
                  activeTab={activeTab}
                  location={location}
                  navigate={navigate}
                  onLogout={handleLogout}
                  onCloseMobile={() => setMobileNavOpen(false)}
                  user={user}
                />
                </div>
              </aside>
            </>
          )}

          <div className="flex-1 flex flex-col min-w-0 min-h-screen md:min-h-0">
            <header className="h-14 md:h-16 border-b border-border flex items-center justify-between px-4 md:px-8 bg-card shrink-0 gap-3">
              <div className="flex items-center gap-3 min-w-0">
                <button
                  type="button"
                  onClick={() => setMobileNavOpen(true)}
                  className="md:hidden p-2 -ml-1 text-muted hover:text-foreground rounded-lg hover:bg-[var(--color-panel-hover)]"
                  aria-label="Open menu"
                >
                  <Menu size={22} />
                </button>
                <h2 className="text-base md:text-lg font-bold font-display truncate">
                  {activeTitle}
                </h2>
              </div>
              <div className="text-xs text-muted shrink-0" aria-live="polite">
                {now.toLocaleTimeString()}
              </div>
            </header>

            <ConnectionBanner />

            <main className="flex-1 overflow-y-auto bg-background pb-20 md:pb-0">
              <Routes>
                <Route path="/" element={<Dashboard />} />
                <Route path="/real-time" element={<RealTimeStatus currentUser={user} />} />
                <Route path="/settings/*" element={<Settings currentUser={user} />} />
                <Route path="/history" element={<History />} />
                <Route path="/alerts" element={<Alerts currentUser={user} />} />
                <Route path="*" element={<NotFoundView />} />
              </Routes>
            </main>
          </div>

          <MobileBottomNav activeTab={activeTab} navigate={navigate} />
        </div>
      </BeaconProvider>
    </SettingsProvider>
  );
}

function SidebarNav({ activeTab, location, navigate, onLogout, onCloseMobile, user }) {
  const { beaconList } = useBeacons();
  const { config } = useSettings();
  const tempAlertCount = countTempAlerts(beaconList, config);
  const isAdmin = user?.role === 'admin';
  const settingsSections = getSettingsSections(isAdmin);
  const [settingsOpen, setSettingsOpen] = useState(activeTab === 'settings');
  const settingsSubPath = getSettingsSubPath(location.pathname);

  useEffect(() => {
    if (activeTab === 'settings') {
      setSettingsOpen(true);
    } else {
      setSettingsOpen(false);
    }
  }, [activeTab]);

  const handleSettingsToggle = () => {
    if (activeTab === 'settings') {
      setSettingsOpen((open) => !open);
      return;
    }
    navigate(settingsSectionPath(SETTINGS_DEFAULT_PATH));
    setSettingsOpen(true);
  };

  const handleSettingsSection = (path) => {
    navigate(settingsSectionPath(path));
    setSettingsOpen(true);
    onCloseMobile?.();
  };

  return (
    <div className="flex flex-col h-full min-h-0 gap-4">
      <div className="shrink-0 hidden md:block">
        <BrandMark />
      </div>

      <nav className="flex flex-col gap-2 flex-1 min-h-0 overflow-y-auto pr-1" aria-label="Main navigation">
        <NavItem
          icon={<LayoutDashboard size={20} />}
          label="Dashboard"
          active={activeTab === 'dashboard'}
          onClick={() => navigate('/')}
        />
        <NavItem
          icon={<Radio size={20} />}
          label="Real Time Status"
          active={activeTab === 'real-time'}
          onClick={() => navigate('/real-time')}
        />
        <NavItem
          icon={<HistoryIcon size={20} />}
          label="History"
          active={activeTab === 'history'}
          onClick={() => navigate('/history')}
        />
        <NavItem
          icon={<Bell size={20} />}
          label="Alerts"
          active={activeTab === 'alerts'}
          onClick={() => navigate('/alerts')}
          badge={tempAlertCount > 0 ? tempAlertCount : null}
        />
        <div className="mt-4 pt-4 border-t border-border">
          <button
            type="button"
            onClick={handleSettingsToggle}
            aria-expanded={settingsOpen}
            aria-current={activeTab === 'settings' ? 'page' : undefined}
            className={`flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200 w-full focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-cyan/50 ${
              activeTab === 'settings'
                ? 'bg-cyan-100 text-cyan-800 ring-1 ring-cyan-300 dark:bg-accent-cyan/10 dark:text-accent-cyan dark:ring-accent-cyan/20'
                : 'text-muted hover:text-foreground hover:bg-[var(--color-panel-hover)]'
            }`}
          >
            <SettingsIcon size={20} />
            <span className="font-medium flex-1 text-left">Settings</span>
            <ChevronDown
              size={18}
              className={`shrink-0 transition-transform duration-200 ${settingsOpen ? 'rotate-180' : ''}`}
              aria-hidden="true"
            />
          </button>

          {settingsOpen && (
            <div
              className="mt-1 ml-3 pl-3 border-l border-border flex flex-col gap-0.5 max-h-44 overflow-y-auto"
              role="group"
              aria-label="Settings sections"
            >
              {settingsSections.map((item) => {
                const isActive = activeTab === 'settings' && settingsSubPath === item.path;
                return (
                  <button
                    key={item.path}
                    type="button"
                    onClick={() => handleSettingsSection(item.path)}
                    aria-current={isActive ? 'true' : undefined}
                    className={`text-left px-3 py-2 rounded-lg text-sm transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-cyan/50 ${
                      isActive
                        ? 'text-accent-cyan bg-cyan-50 dark:bg-accent-cyan/10 font-medium'
                        : 'text-muted hover:text-foreground hover:bg-[var(--color-panel-hover)]'
                    }`}
                  >
                    {item.label}
                  </button>
                );
              })}
            </div>
          )}
        </div>
      </nav>

      <div className="shrink-0 flex flex-col gap-4 pt-4 border-t border-border">
        <button
          type="button"
          onClick={onLogout}
          className="flex items-center gap-3 px-4 py-2 text-danger hover:bg-danger-muted rounded-xl transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-danger/40"
        >
          <LogOut size={18} />
          <span className="font-medium text-sm">Sign Out</span>
        </button>
        <div className="p-4 glass-panel flex items-center gap-3">
          <UserAvatar username={user.username} />
          <div className="overflow-hidden">
            <p className="text-sm font-bold truncate">{user.username}</p>
            <p className="text-[10px] text-muted uppercase tracking-widest">{user.role}</p>
          </div>
        </div>
      </div>
    </div>
  );
}

function MobileBottomNav({ activeTab, navigate }) {
  const { beaconList } = useBeacons();
  const { config } = useSettings();
  const tempAlertCount = countTempAlerts(beaconList, config);

  const tabs = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard, path: '/' },
    { id: 'real-time', label: 'Live', icon: Radio, path: '/real-time' },
    { id: 'alerts', label: 'Alerts', icon: Bell, path: '/alerts', badge: tempAlertCount },
    { id: 'settings', label: 'Settings', icon: SettingsIcon, path: '/settings/appearance' },
  ];

  return (
    <nav
      className="md:hidden fixed bottom-0 inset-x-0 z-30 border-t border-border bg-card safe-area-pb"
      aria-label="Quick navigation"
    >
      <div className="flex items-stretch justify-around">
        {tabs.map(({ id, label, icon: Icon, path, badge }) => {
          const active = activeTab === id;
          return (
            <button
              key={id}
              type="button"
              onClick={() => navigate(path)}
              aria-current={active ? 'page' : undefined}
              className={`relative flex-1 flex flex-col items-center gap-0.5 py-2.5 text-[10px] font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-accent-cyan/50 ${
                active ? 'text-accent-cyan' : 'text-muted'
              }`}
            >
              <Icon size={20} />
              <span>{label}</span>
              {badge > 0 && (
                <span className="absolute top-1 right-[calc(50%-22px)] min-w-[1rem] h-4 px-1 rounded-full bg-danger text-white text-[9px] font-bold flex items-center justify-center">
                  {badge}
                </span>
              )}
            </button>
          );
        })}
      </div>
    </nav>
  );
}

function BrandMark() {
  return (
    <div className="flex items-center gap-3 px-2">
      <div className="w-8 h-8 rounded-lg accent-gradient flex items-center justify-center">
        <RadioIcon />
      </div>
      <h1 className="text-xl font-bold font-display text-gradient">TempTrack</h1>
    </div>
  );
}

const PlaceholderView = ({ name }) => (
  <div className="p-8 md:p-12 text-center text-muted">
    <h2 className="text-2xl font-bold mb-4 text-foreground">{name} is coming soon</h2>
    <p>We are currently implementing this feature.</p>
  </div>
);

const NotFoundView = () => (
  <div className="p-8 md:p-12 text-center text-muted">
    <h2 className="text-2xl font-bold mb-4 text-foreground">Page not found</h2>
    <p>The page you requested does not exist.</p>
  </div>
);

function App() {
  return (
    <Router>
      <AppContent />
    </Router>
  );
}

const NavItem = ({ icon, label, active, onClick, badge }) => (
  <button
    type="button"
    onClick={onClick}
    aria-current={active ? 'page' : undefined}
    className={`flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200 w-full focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-cyan/50 ${
      active
        ? 'bg-cyan-100 text-cyan-800 ring-1 ring-cyan-300 dark:bg-accent-cyan/10 dark:text-accent-cyan dark:ring-accent-cyan/20'
        : 'text-muted hover:text-foreground hover:bg-[var(--color-panel-hover)]'
    }`}
  >
    {icon}
    <span className="font-medium flex-1 text-left">{label}</span>
    {badge != null && (
      <span className="min-w-[1.25rem] h-5 px-1.5 rounded-full bg-danger text-white text-[10px] font-bold flex items-center justify-center">
        {badge}
      </span>
    )}
  </button>
);

const RadioIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-white" aria-hidden="true">
    <path d="M4.9 19.1C1 15.2 1 8.8 4.9 4.9" />
    <path d="M7.8 16.2c-2.3-2.3-2.3-6.1 0-8.4" />
    <circle cx="12" cy="12" r="2" />
    <path d="M16.2 7.8c2.3 2.3 2.3 6.1 0 8.4" />
    <path d="M19.1 4.9C23 8.8 23 15.2 19.1 19.1" />
  </svg>
);

export default App;
