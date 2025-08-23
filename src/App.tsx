
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AppProvider } from "@/contexts/AppContext";
import { ThemeProvider } from "@/contexts/ThemeContext";
import { I18nProvider } from "@/contexts/I18nContext";
import { VoiceSettingsProvider } from "@/contexts/VoiceSettingsContext";
import Navigation from "@/components/Navigation";
import Home from "./pages/Home";
import Dashboard from "./pages/Dashboard";
import Review from "./pages/Review";
import Manage from "./pages/Manage";
import Settings from "./pages/Settings";
import NotFound from "./pages/NotFound";
import ScrollToTopOnRouteChange from "@/components/ScrollToTopOnRouteChange";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <ThemeProvider>
      <I18nProvider>
        <VoiceSettingsProvider>
          <TooltipProvider>
            <AppProvider>
            <Toaster />

            <Sonner />
            <BrowserRouter>
             <ScrollToTopOnRouteChange />
              <div className="min-h-screen bg-background">
                <Navigation />
                <Routes>
                  <Route path="/" element={<Home />} />
                  <Route path="/dashboard" element={<Dashboard />} />
                  <Route path="/review" element={<Review />} />
                  <Route path="/manage" element={<Manage />} />
                  <Route path="/settings" element={<Settings />} />
                  <Route path="/*" element={<NotFound />} />
                </Routes>
              </div>
            </BrowserRouter>
            </AppProvider>
          </TooltipProvider>
        </VoiceSettingsProvider>
      </I18nProvider>
    </ThemeProvider>
  </QueryClientProvider>
);

export default App;
