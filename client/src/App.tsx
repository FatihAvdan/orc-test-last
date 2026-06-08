import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider } from "@/contexts/auth";
import { ProtectedRoute } from "@/components/protected-route";
import DashboardLayout from "@/components/layout/dashboard-layout";
import LoginPage from "@/pages/login";
import RegisterPage from "@/pages/register";
import DashboardPage from "@/pages/dashboard";
import PortfoliosPage from "@/pages/portfolios";
import PortfolioEditPage from "@/pages/portfolio-edit";
import NotFoundPage from "@/pages/not-found";

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Routes>
          <Route path="/login" element={<LoginPage />} />
          <Route path="/register" element={<RegisterPage />} />

          <Route element={<ProtectedRoute />}>
            <Route element={<DashboardLayout />}>
              <Route path="/dashboard" element={<DashboardPage />} />
              <Route path="/portfolios" element={<PortfoliosPage />} />
              <Route path="/portfolios/new" element={<PortfolioEditPage />} />
              <Route path="/portfolios/:id/edit" element={<PortfolioEditPage />} />
            </Route>
          </Route>

          <Route path="/" element={<Navigate to="/dashboard" replace />} />
          <Route path="*" element={<NotFoundPage />} />
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  );
}
