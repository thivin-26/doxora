import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "./context/AuthContext";
import ProtectedRoute from "./components/ProtectedRoute";
import Landing from "./pages/Landing";
import Login from "./pages/Login";
import Dashboard from "./pages/Dashboard";
import VisitorAnalytics from "./pages/VisitorAnalytics";
import CustomEffects from "./components/CustomEffects";
import VisitorTracker from "./components/VisitorTracker";

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <CustomEffects />
        <VisitorTracker />
        <Routes>
          <Route path="/" element={<Landing />} />
          <Route path="/login" element={<Login />} />
          <Route path="/analytics" element={<VisitorAnalytics />} />
          <Route
            path="/dashboard"
            element={
              <ProtectedRoute>
                <Dashboard />
              </ProtectedRoute>
            }
          />
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  );
}
