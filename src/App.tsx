import { HotelProvider, useHotel } from './context/HotelContext';
import { PlatformDashboard } from './components/Dashboard/PlatformDashboard';
import { DashboardLayout } from './components/Dashboard/DashboardLayout';

function AppContent() {
  const { appMode } = useHotel();

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

