import { HotelProvider, useHotel } from './context/HotelContext';
import { PlatformDashboard } from './components/Dashboard/PlatformDashboard';
import { DashboardLayout } from './components/Dashboard/DashboardLayout';
import { LandingPage } from './components/Landing/LandingPage';
import { OnboardingPage } from './components/Landing/OnboardingPage';

function AppContent() {
  const { appMode } = useHotel();

  if (appMode === 'landing') {
    return <LandingPage />;
  }

  if (appMode === 'onboarding') {
    return <OnboardingPage />;
  }

  if (appMode === 'dashboard') {
    return <PlatformDashboard />;
  }

  return <DashboardLayout />;
}

function App() {
  return (
    <HotelProvider>
      <AppContent />
    </HotelProvider>
  );
}

export default App;

