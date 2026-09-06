import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AppProvider, useApp } from './context/AppContext';

// Layouts
import { FishermanLayout } from './layouts/FishermanLayout';
import { OthersLayout } from './layouts/OthersLayout';

// Onboarding Pages
import { Page1Welcome } from './pages/Page1Welcome';
import { Page2Language } from './pages/Page2Language';
import { Page3UserDetails } from './pages/Page3UserDetails';

// Fisherman Flow (Strictly 3 Pages, NO navigation)
import { FishermanVoicePage } from './pages/fisherman/FishermanVoicePage';
import { FishermanManualInputPage } from './pages/fisherman/FishermanManualInputPage';
import { FishermanRecommendationPage } from './pages/fisherman/FishermanRecommendationPage';

// Others Flow (Full Marine Intelligence Dashboard with Persistent Task Bar)
import { OthersHomePage } from './pages/others/OthersHomePage';
import { OthersFishingZonesPage } from './pages/others/OthersFishingZonesPage';
import { Page6Productivity } from './pages/Page6Productivity';
import { Page7MarineAnalysis } from './pages/Page7MarineAnalysis';
import { Page12Disasters } from './pages/Page12Disasters';
import { Page13RiskPrediction } from './pages/Page13RiskPrediction';

// Helper component for legacy or shortcut redirects based on user role
const RoleHomeRedirect: React.FC = () => {
  const { userRole } = useApp();
  return userRole === 'fisherman' ? (
    <Navigate to="/fisherman/voice" replace />
  ) : (
    <Navigate to="/others/home" replace />
  );
};

export const App: React.FC = () => {
  return (
    <AppProvider>
      <BrowserRouter>
        <Routes>
          {/* ================= 1. ONBOARDING FLOW ================= */}
          {/* Page 1: Welcome Screen */}
          <Route path="/" element={<Page1Welcome />} />

          {/* Page 2: Global Language Selection (9 Languages) */}
          <Route path="/language" element={<Page2Language />} />

          {/* Page 3: User Details & Operational Role Selection */}
          <Route path="/user-details" element={<Page3UserDetails />} />

          {/* ================= 2. FISHERMAN ROLE EXPERIENCE ================= */}
          {/* Minimal shell with strictly NO navigation bar, task bar, or menus */}
          <Route path="/fisherman" element={<FishermanLayout />}>
            {/* Index redirect to Page 1: Voice */}
            <Route index element={<Navigate to="/fisherman/voice" replace />} />

            {/* Fisherman Page 1: Voice Assistant */}
            <Route path="voice" element={<FishermanVoicePage />} />

            {/* Fisherman Page 2: Manual Input (on voice X) */}
            <Route path="manual" element={<FishermanManualInputPage />} />

            {/* Fisherman Page 3: Best Fishing Recommendation (on Analyze) */}
            <Route path="recommendation" element={<FishermanRecommendationPage />} />
          </Route>

          {/* ================= 3. OTHERS ROLE EXPERIENCE ================= */}
          {/* Full Dashboard shell with persistent Navigation/Task Bar */}
          <Route path="/others" element={<OthersLayout />}>
            {/* Index redirect to Home */}
            <Route index element={<Navigate to="/others/home" replace />} />

            {/* Others Page: Home Dashboard */}
            <Route path="home" element={<OthersHomePage />} />

            {/* Others Page: Fishing Zones */}
            <Route path="fishing" element={<OthersFishingZonesPage />} />

            {/* Others Page: Productivity Analysis */}
            <Route path="productivity" element={<Page6Productivity />} />

            {/* Others Page: Marine Analysis Suite (SST, Weather, Ocean, Chlorophyll, Spatial) */}
            <Route path="analysis" element={<Page7MarineAnalysis />} />

            {/* Others Page: Disaster & Historical Period Analysis */}
            <Route path="disasters" element={<Page12Disasters />} />

            {/* Others Page: Automated Risk Prediction (30s Live Refresh) */}
            <Route path="risk-prediction" element={<Page13RiskPrediction />} />
          </Route>

          {/* Legacy route compatibility */}
          <Route path="/home" element={<RoleHomeRedirect />} />
          <Route path="/fishing" element={<Navigate to="/others/fishing" replace />} />
          <Route path="/productivity" element={<Navigate to="/others/productivity" replace />} />
          <Route path="/analysis" element={<Navigate to="/others/analysis" replace />} />
          <Route path="/disasters" element={<Navigate to="/others/disasters" replace />} />
          <Route path="/risk-prediction" element={<Navigate to="/others/risk-prediction" replace />} />

          {/* Catch-all Fallback */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
    </AppProvider>
  );
};

export default App;
