import React, { useState } from 'react';
import { AppScreen, UserProfile, UserPreferences, PFZZone, MarineAlert } from './types';
import {
  initialUserProfile,
  initialPreferences,
  currentSeaConditions,
  initialMetrics,
  pfzZones,
  initialAlerts,
} from './data/mockData';
import { Sidebar } from './components/Sidebar';
import { Header } from './components/Header';
import { LoginScreen } from './components/LoginScreen';
import { HomeScreen } from './components/HomeScreen';
import { DashboardScreen } from './components/DashboardScreen';
import { AnalyticsScreen } from './components/AnalyticsScreen';
import { PFZAreasScreen } from './components/PFZAreasScreen';
import { SettingsScreen } from './components/SettingsScreen';
import { NotificationsModal } from './components/NotificationsModal';
import { ZoneDetailsModal } from './components/ZoneDetailsModal';
import { SupportModal } from './components/SupportModal';
import { LegalModal } from './components/LegalModal';

export default function App() {
  const [currentScreen, setCurrentScreen] = useState<AppScreen>('home');
  const [userProfile, setUserProfile] = useState<UserProfile>(initialUserProfile);
  const [preferences, setPreferences] = useState<UserPreferences>(initialPreferences);
  const [selectedZoneId, setSelectedZoneId] = useState<string>('pfz-03');
  const [alerts, setAlerts] = useState<MarineAlert[]>(initialAlerts);

  // Modals state
  const [isNotificationsOpen, setIsNotificationsOpen] = useState(false);
  const [isHelpOpen, setIsHelpOpen] = useState(false);
  const [zoneModalTarget, setZoneModalTarget] = useState<PFZZone | null>(null);
  const [legalModal, setLegalModal] = useState<{ isOpen: boolean; title: string; content: string }>({
    isOpen: false,
    title: '',
    content: '',
  });

  // Mobile sidebar drawer
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);

  const unreadAlertCount = alerts.filter((a) => !a.isRead).length;

  const handleMarkAllAlertsAsRead = () => {
    setAlerts((prev) => prev.map((a) => ({ ...a, isRead: true })));
  };

  const handleLoginSuccess = (name: string) => {
    setUserProfile((prev) => ({
      ...prev,
      name: name || 'Ramesh',
    }));
    setCurrentScreen('home');
  };

  const handleLogout = () => {
    setCurrentScreen('login');
  };

  const handleSelectZoneFromDashboard = (zoneId: string) => {
    setSelectedZoneId(zoneId);
    setCurrentScreen('pfz-areas');
  };

  // If on Login screen, render Login Screen standalone
  if (currentScreen === 'login') {
    return <LoginScreen onLoginSuccess={handleLoginSuccess} />;
  }

  return (
    <div
      className={`min-h-screen flex flex-row antialiased transition-colors ${
        preferences.darkMode ? 'bg-slate-900 text-slate-100' : 'bg-[#f7fafe] text-[#0b2545]'
      }`}
    >
      {/* Persistent Left Sidebar */}
      <Sidebar
        currentScreen={currentScreen}
        onNavigate={setCurrentScreen}
        isOpenMobile={isMobileSidebarOpen}
        onCloseMobile={() => setIsMobileSidebarOpen(false)}
        onOpenHelpModal={() => setIsHelpOpen(true)}
      />

      {/* Main Content Area (Offset by 260px on desktop) */}
      <div className="flex-1 flex flex-col min-w-0 lg:pl-[260px]">
        {/* Top Header */}
        <Header
          currentScreen={currentScreen}
          userProfile={userProfile}
          unreadAlertCount={unreadAlertCount}
          onOpenNotifications={() => setIsNotificationsOpen(true)}
          onOpenMobileMenu={() => setIsMobileSidebarOpen(true)}
          onNavigate={setCurrentScreen}
          onLogout={handleLogout}
        />

        {/* Screen Views */}
        <main className="flex-1 px-4 sm:px-8 py-6 max-w-7xl mx-auto w-full">
          {currentScreen === 'home' && <HomeScreen />}

          {currentScreen === 'dashboard' && (
            <DashboardScreen
              seaConditions={currentSeaConditions}
              metrics={initialMetrics}
              onOpenAlertsModal={() => setIsNotificationsOpen(true)}
              onSelectZone={handleSelectZoneFromDashboard}
            />
          )}

          {currentScreen === 'analytics' && <AnalyticsScreen />}

          {currentScreen === 'pfz-areas' && (
            <PFZAreasScreen
              selectedZoneId={selectedZoneId}
              onSelectZone={setSelectedZoneId}
              onOpenZoneModal={(zone) => setZoneModalTarget(zone)}
            />
          )}

          {currentScreen === 'settings' && (
            <SettingsScreen
              userProfile={userProfile}
              preferences={preferences}
              onUpdateProfile={setUserProfile}
              onUpdatePreferences={setPreferences}
              onLogout={handleLogout}
              onOpenHelpModal={() => setIsHelpOpen(true)}
              onOpenLegalModal={(title, content) =>
                setLegalModal({ isOpen: true, title, content })
              }
            />
          )}
        </main>
      </div>

      {/* Modals & Drawers */}
      <NotificationsModal
        isOpen={isNotificationsOpen}
        onClose={() => setIsNotificationsOpen(false)}
        alerts={alerts}
        onMarkAllAsRead={handleMarkAllAlertsAsRead}
      />

      <ZoneDetailsModal
        zone={zoneModalTarget}
        isOpen={!!zoneModalTarget}
        onClose={() => setZoneModalTarget(null)}
      />

      <SupportModal isOpen={isHelpOpen} onClose={() => setIsHelpOpen(false)} />

      <LegalModal
        title={legalModal.title}
        content={legalModal.content}
        isOpen={legalModal.isOpen}
        onClose={() => setLegalModal({ isOpen: false, title: '', content: '' })}
      />
    </div>
  );
}
