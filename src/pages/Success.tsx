import { useLocation, useNavigate, useParams } from "react-router-dom";
import { useState } from "react";
import { printBeneficiaryPdf } from "../lib/pdf";
import type { Beneficiary, Family } from "../types/beneficiary";

export default function Success() {
  const { number } = useParams();
  const location = useLocation();
  const navigate = useNavigate();
  const state = location.state as { family?: Family; beneficiaries?: Beneficiary[] } | null;
  const family = state?.family;
  const beneficiaries = state?.beneficiaries || [];
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const handlePdf = async () => {
    if (!beneficiaries.length) {
      setError("تعذر العثور على ملفات الأبناء. المرجو التواصل مع الإدارة.");
      return;
    }
    setBusy(true);
    setError("");
    try {
      await printBeneficiaryPdf(beneficiaries);
    } catch (e: any) {
      setError(e?.message || "تعذر إنشاء الوثائق.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <main className="container" style={{ padding: "60px 0" }} dir="rtl">
      <div className="card" style={{ maxWidth: 760, margin: "0 auto", padding: 40, textAlign: "center" }}>
        <div style={{ fontSize: 64 }}>✓</div>
        <h1>تم تسجيل الطلب بنجاح</h1>
        <p className="muted">رقم ملف العائلة: <strong>#{number}</strong></p>
        <p className="muted">عدد الأبناء: {family?.children_count || beneficiaries.length}</p>

        <div style={{ background: "#f0fdfa", borderRadius: 14, padding: 20, margin: "25px 0" }}>
          <h3 style={{ marginTop: 0 }}>الوثائق الرسمية</h3>
          <p className="muted">سيتم ترتيب الوثائق ابنًا بابن: سجل الاستفادة ثم الالتزام، ثم الابن الموالي.</p>
          <button className="btn btn-primary" onClick={handlePdf} disabled={busy} style={{ width: "100%", padding: 14 }}>
            {busy ? "جاري إنشاء الوثائق..." : "📄 تحميل الوثائق PDF"}
          </button>
          {error && <div className="error" style={{ background: "#fff1f2", padding: 12, borderRadius: 10, marginTop: 14 }}>{error}</div>}
        </div>

        <button className="btn btn-ghost" onClick={() => navigate("/inscription")} disabled={busy}>تسجيل ملف عائلي آخر</button>
      </div>
    </main>
  );
}