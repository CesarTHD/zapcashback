import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider } from "@/contexts/AuthContext";
import { ProtectedRoute } from "@/components/ProtectedRoute";

import LoginPage from "./pages/LoginPage";
import { SatDashboard, SatClients, SatClient, SatCashback, SatRules, SatAudience, SatAutomations } from "./pages/SatPages";
import SettingsPage from "./pages/SettingsPage";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
       <AuthProvider>
        <Routes>
           <Route path="/login" element={<LoginPage />} />
           <Route path="/" element={<Navigate to="/dashboard" />} />
           <Route path="/dashboard" element={<ProtectedRoute><SatDashboard /></ProtectedRoute>} />
           <Route path="/contacts" element={<ProtectedRoute><SatClients /></ProtectedRoute>} />
           <Route path="/contacts/:id" element={<ProtectedRoute><SatClient /></ProtectedRoute>} />
           <Route path="/cashback" element={<ProtectedRoute><SatCashback /></ProtectedRoute>} />
           <Route path="/cashback/rules" element={<ProtectedRoute><SatRules /></ProtectedRoute>} />
           <Route path="/sat-audience" element={<ProtectedRoute><SatAudience /></ProtectedRoute>} />
           <Route path="/sat-audience/automations" element={<ProtectedRoute><SatAutomations /></ProtectedRoute>} />
           <Route path="/segmentation" element={<Navigate to="/sat-audience" replace />} />
           <Route path="/campaigns" element={<Navigate to="/sat-audience" replace />} />
           <Route path="/automations" element={<Navigate to="/sat-audience/automations" replace />} />
           <Route path="/history" element={<Navigate to="/sat-audience" replace />} />
           <Route path="/settings" element={<ProtectedRoute><SettingsPage /></ProtectedRoute>} />
          <Route path="*" element={<NotFound />} />
        </Routes>
       </AuthProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
