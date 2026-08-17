import { Navigate, Route, Routes } from "react-router-dom";
import type { ReactNode } from "react";
import { useEffect, useState } from "react";
import Registration from "./pages/Registration";
import Success from "./pages/Success";
import AdminLogin from "./pages/AdminLogin";
import AdminDashboard from "./pages/AdminDashboard";
import BeneficiaryDetails from "./pages/BeneficiaryDetails";
import { useAuth } from "./lib/auth";
import { supabase } from "./lib/supabase";

function Protected({ children }: { children: ReactNode }) {
  const { session, loading } = useAuth();
  const [checkingAdmin, setCheckingAdmin] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);

  useEffect(() => {
    if (loading) return;
    if (!session) {
      setCheckingAdmin(false);
      return;
    }
    let cancelled = false;
    setCheckingAdmin(true);
    supabase.rpc("is_admin").then(({ data, error }) => {
      if (cancelled) return;
      setIsAdmin(!error && data === true);
      setCheckingAdmin(false);
    });
    return () => {
      cancelled = true;
    };
  }, [session, loading]);

  if (loading || checkingAdmin) return <div style={{ padding: 40, textAlign: "center" }}>جاري التحميل...</div>;
  // A valid Supabase Auth session is not enough — it also has to belong to admin_users.
  // Without this check, any authenticated (non-admin) account could open the dashboard shell.
  if (!session || !isAdmin) return <Navigate to="/admin/login" replace />;
  return <>{children}</>;
}

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<Navigate to="/inscription" replace />} />
      <Route path="/inscription" element={<Registration />} />
      <Route path="/success/:number" element={<Success />} />
      <Route path="/admin/login" element={<AdminLogin />} />
      <Route path="/admin" element={<Protected><AdminDashboard /></Protected>} />
      <Route path="/admin/beneficiary/:id" element={<Protected><BeneficiaryDetails /></Protected>} />
      <Route path="*" element={<Navigate to="/inscription" replace />} />
    </Routes>
  );
}
