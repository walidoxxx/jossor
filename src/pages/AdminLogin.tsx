import { useState } from "react";
import type { FormEvent } from "react";
import { supabase } from "../lib/supabase";
import { useNavigate } from "react-router-dom";
import Header from "../components/Header";

export default function AdminLogin() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const nav = useNavigate();

  async function login(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError("");

    const { error: authError } = await supabase.auth.signInWithPassword({ email, password });
    if (authError) {
      setError("البريد الإلكتروني أو كلمة المرور غير صحيحة.");
      setBusy(false);
      return;
    }

    // Successful Supabase Auth login only proves the credentials are valid — it does not
    // mean this account is allowed into the dashboard (spec #17). Confirm admin_users
    // membership before letting the session through, and sign back out if it fails.
    const { data: isAdmin, error: adminError } = await supabase.rpc("is_admin");
    if (adminError || isAdmin !== true) {
      await supabase.auth.signOut();
      setError("هذا الحساب غير مخول بالدخول إلى لوحة الإدارة.");
      setBusy(false);
      return;
    }

    nav("/admin");
    setBusy(false);
  }

  return (
    <>
      <Header />
      <main className="container" style={{ padding: "70px 0" }}>
        <form className="card" onSubmit={login} style={{ maxWidth: 430, margin: "0 auto", padding: 28 }}>
          <h1 style={{ marginTop: 0 }}>دخول الإدارة</h1>
          {error && <div className="error">{error}</div>}
          <div className="field" style={{ marginTop: 16 }}>
            <label>البريد الإلكتروني</label>
            <input type="email" required value={email} onChange={e => setEmail(e.target.value)} />
          </div>
          <div className="field" style={{ marginTop: 16 }}>
            <label>كلمة المرور</label>
            <input type="password" required value={password} onChange={e => setPassword(e.target.value)} />
          </div>
          <button className="btn btn-primary" style={{ width: "100%", marginTop: 20 }} disabled={busy}>
            {busy ? "جاري الدخول..." : "دخول"}
          </button>
        </form>
      </main>
    </>
  );
}