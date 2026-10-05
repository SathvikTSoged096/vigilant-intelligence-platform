import {
    BrowserRouter,
    Navigate,
    Outlet,
    Route,
    Routes,
    useLocation,
} from "react-router-dom";

import { AuthProvider, useAuth } from "./context/AuthContext";
import { ProcessProvider } from "./context/ProcessContext";

import Sidebar from "./components/Sidebar";

import AIReport from "./pages/AIReport";
import Dashboard from "./pages/Dashboard";
import Documents from "./pages/Documents";
import KnowledgeGraph from "./pages/KnowledgeGraph";
import Login from "./pages/Login";
import Settings from "./pages/Settings";


function Guard() {
  const { isAuthenticated, loading } = useAuth();
  const location = useLocation();

  if (loading) {
    return (
      <div className="min-h-screen grid place-items-center bg-obsidian">
        INITIALIZING...
      </div>
    );
  }

  if (!isAuthenticated) {
    return (
      <Navigate
        to="/login"
        state={{ from: location.pathname }}
        replace
      />
    );
  }

  return (
    <>
      <Sidebar />

      <main className="ml-56 min-h-screen bg-obsidian p-3">
        <Outlet />
      </main>
    </>
  );
}


export default function App() {
  return (
    <AuthProvider>
      <ProcessProvider>
        <BrowserRouter>
          <Routes>

            <Route
              path="/login"
              element={<Login />}
            />

            <Route element={<Guard />}>

              <Route
                path="/dashboard"
                element={<Dashboard />}
              />

              <Route
                path="/documents"
                element={<Documents />}
              />

              <Route
                path="/reports"
                element={<AIReport />}
              />

              <Route
                path="/graph"
                element={<KnowledgeGraph />}
              />

              <Route
                path="/settings"
                element={<Settings />}
              />

            </Route>

            <Route
              path="*"
              element={<Navigate to="/dashboard" />}
            />

          </Routes>
        </BrowserRouter>
      </ProcessProvider>
    </AuthProvider>
  );
}