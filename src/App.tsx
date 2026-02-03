import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "@/hooks/useAuth";
import { SubscriptionProvider } from "@/hooks/useSubscription";
import { SectorProvider } from "@/contexts/SectorContext";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import Landing from "./pages/Landing";
import Login from "./pages/Login";
import Signup from "./pages/Signup";
import Dashboard from "./pages/Dashboard";
import DomainLanding from "./pages/DomainLanding";
import Profile from "./pages/Profile";
import Billing from "./pages/Billing";
import WorkspacePreferences from "./pages/WorkspacePreferences";
import Pricing from "./pages/Pricing";
import About from "./pages/About";
import Services from "./pages/Services";
import Contact from "./pages/Contact";
import Terms from "./pages/Terms";
import Privacy from "./pages/Privacy";
import NotFound from "./pages/NotFound";
// New pages
import Domains from "./pages/Domains";
import HowItWorks from "./pages/HowItWorks";
import TrendForecasting from "./pages/solutions/TrendForecasting";
import SupplierResearch from "./pages/solutions/SupplierResearch";
import MarketAnalysis from "./pages/solutions/MarketAnalysis";
import SustainabilityInsights from "./pages/solutions/SustainabilityInsights";
import Insights from "./pages/Insights";
import Help from "./pages/Help";
import Careers from "./pages/Careers";
import Press from "./pages/Press";
import Cookies from "./pages/Cookies";

const queryClient = new QueryClient();

const App = () => {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <SubscriptionProvider>
          <SectorProvider>
            <TooltipProvider>
              <Toaster />
              <Sonner />
              <BrowserRouter>
                <Routes>
                  <Route path="/" element={<Landing />} />
                  <Route path="/login" element={<Login />} />
                  <Route path="/signup" element={<Signup />} />
                  <Route
                    path="/dashboard"
                    element={
                      <ProtectedRoute>
                        <Dashboard />
                      </ProtectedRoute>
                    }
                  />
                  <Route
                    path="/domain/:domain"
                    element={
                      <ProtectedRoute>
                        <DomainLanding />
                      </ProtectedRoute>
                    }
                  />
                  <Route
                    path="/profile"
                    element={
                      <ProtectedRoute>
                        <Profile />
                      </ProtectedRoute>
                    }
                  />
                  <Route path="/pricing" element={<Pricing />} />
                  <Route
                    path="/billing"
                    element={
                      <ProtectedRoute>
                        <Billing />
                      </ProtectedRoute>
                    }
                  />
                  <Route
                    path="/preferences"
                    element={
                      <ProtectedRoute>
                        <WorkspacePreferences />
                      </ProtectedRoute>
                    }
                  />
                  <Route path="/about" element={<About />} />
                  <Route path="/services" element={<Services />} />
                  <Route path="/contact" element={<Contact />} />
                  <Route path="/terms" element={<Terms />} />
                  <Route path="/privacy" element={<Privacy />} />
                  {/* New pages */}
                  <Route path="/domains" element={<Domains />} />
                  <Route path="/how-it-works" element={<HowItWorks />} />
                  <Route path="/solutions/trend-forecasting" element={<TrendForecasting />} />
                  <Route path="/solutions/supplier-research" element={<SupplierResearch />} />
                  <Route path="/solutions/market-analysis" element={<MarketAnalysis />} />
                  <Route path="/solutions/sustainability-insights" element={<SustainabilityInsights />} />
                  <Route path="/insights" element={<Insights />} />
                  <Route path="/help" element={<Help />} />
                  <Route path="/careers" element={<Careers />} />
                  <Route path="/press" element={<Press />} />
                  <Route path="/cookies" element={<Cookies />} />
                  <Route path="*" element={<NotFound />} />
                </Routes>
              </BrowserRouter>
            </TooltipProvider>
          </SectorProvider>
        </SubscriptionProvider>
      </AuthProvider>
    </QueryClientProvider>
  );
};

export default App;
