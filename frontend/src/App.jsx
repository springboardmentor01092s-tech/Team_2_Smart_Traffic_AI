import React from "react";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider } from "./context/AuthContext";
import { ThemeProvider } from "./context/ThemeContext";
import ProtectedRoute from "./routes/ProtectedRoute";

import Login from "./pages/Login";
import ForgotPassword from "./pages/ForgotPassword";
import Dashboard from "./pages/Dashboard";
import LiveMonitoring from "./pages/LiveMonitoring";
import TrafficPrediction from "./pages/TrafficPrediction";
import RouteAnalysis from "./pages/RouteAnalysis";
import Alerts from "./pages/Alerts";
import TrafficHistory from "./pages/TrafficHistory";
import Reports from "./pages/Reports";
import UsersRoles from "./pages/UsersRoles";
import SystemSettings from "./pages/SystemSettings";
import Profile from "./pages/Profile";

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <ThemeProvider>
          <Routes>
            {/* Public Routes */}
            <Route path="/login" element={<Login />} />
            <Route path="/forgot-password" element={<ForgotPassword />} />

            {/* Protected Routes */}
            <Route
              path="/dashboard"
              element={
                <ProtectedRoute>
                  <Dashboard />
                </ProtectedRoute>
              }
            />
            <Route
              path="/live-monitoring"
              element={
                <ProtectedRoute>
                  <LiveMonitoring />
                </ProtectedRoute>
              }
            />
            <Route
              path="/traffic-prediction"
              element={
                <ProtectedRoute>
                  <TrafficPrediction />
                </ProtectedRoute>
              }
            />
            <Route
              path="/route-analysis"
              element={
                <ProtectedRoute>
                  <RouteAnalysis />
                </ProtectedRoute>
              }
            />
            <Route
              path="/alerts"
              element={
                <ProtectedRoute>
                  <Alerts />
                </ProtectedRoute>
              }
            />
            <Route
              path="/traffic-history"
              element={
                <ProtectedRoute>
                  <TrafficHistory />
                </ProtectedRoute>
              }
            />
            <Route
              path="/reports"
              element={
                <ProtectedRoute>
                  <Reports />
                </ProtectedRoute>
              }
            />
            <Route
              path="/users-roles"
              element={
                <ProtectedRoute adminOnly>
                  <UsersRoles />
                </ProtectedRoute>
              }
            />
            <Route
              path="/system-settings"
              element={
                <ProtectedRoute adminOnly>
                  <SystemSettings />
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

            {/* Default Route */}
            <Route path="/" element={<Navigate to="/login" replace />} />
            <Route path="*" element={<Navigate to="/login" replace />} />
          </Routes>
        </ThemeProvider>
      </AuthProvider>
    </BrowserRouter>
  );
}

