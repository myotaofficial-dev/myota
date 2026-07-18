import { HotelProvider, useHotel } from './context/HotelContext';
import { PlatformDashboard } from './components/Dashboard/PlatformDashboard';
import { DashboardLayout } from './components/Dashboard/DashboardLayout';
import { LandingPage } from './components/Landing/LandingPage';
import { OnboardingPage } from './components/Landing/OnboardingPage';
import { GuestPaymentLinkView } from './components/Dashboard/GuestPaymentLinkView';
import { OrganicTemplate } from './components/Templates/OrganicTemplate';

function AppContent() {
  const { appMode, hotelInfo } = useHotel();

  // Handle guest-facing payment links routing
  const params = new URLSearchParams(window.location.search);
  const paymentLink = params.get('payment_link');

  if (paymentLink) {
    return <GuestPaymentLinkView linkCode={paymentLink} />;
  }

  // Handle subdomain and preview routing
  const previewSub = params.get('preview');
  const hostname = window.location.hostname;
  const isLocalhost = hostname === 'localhost' || hostname === '127.0.0.1';
  const parts = hostname.split('.');
  const hasSubdomain = !isLocalhost && parts.length > 2 && parts[0] !== 'www';

  if (previewSub || hasSubdomain) {
    if (!hotelInfo || !hotelInfo.name) {
      return (
        <div className="min-h-screen bg-stone-50 flex items-center justify-center">
          <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-zinc-800"></div>
        </div>
      );
    }
    return (
      <div className="w-screen h-screen flex flex-col overflow-hidden">
        <OrganicTemplate />
      </div>
    );
  }

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

