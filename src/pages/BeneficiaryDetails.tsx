import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { supabase, PHOTO_BUCKET } from "../lib/supabase";
import { printBeneficiaryPdf } from "../lib/pdf";
import type { Beneficiary, Family } from "../types/beneficiary";

export default function BeneficiaryDetails() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [child, setChild] = useState<Beneficiary | null>(null);
  const [siblings, setSiblings] = useState<Beneficiary[]>([]);
  const [family, setFamily] = useState<Family | null>(null);
  const [photo, setPhoto] = useState("");
  const [deathCertificateUrl, setDeathCertificateUrl] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      if (!id) return;
      const { data } = await supabase.from("beneficiaries").select("*").eq("id", id).single();
      if (!data) return setLoading(false);

      const current = data as Beneficiary;
      setChild(current);

      const [{ data: familyData }, { data: familyChildren }] = await Promise.all([
        supabase.from("families").select("*").eq("id", current.family_id).single(),
        supabase.from("beneficiaries").select("*").eq("family_id", current.family_id).order("child_order", { ascending: true }),
      ]);

      setFamily((familyData || null) as Family | null);
      setSiblings((familyChildren || []) as Beneficiary[]);

      if (current.photo_path) {
        const { data: signed } = await supabase.storage.from(PHOTO_BUCKET).createSignedUrl(current.photo_path, 3600);
        setPhoto(signed?.signedUrl || "");
      }

      if (familyData?.death_certificate_path) {
        const { data: deathSigned } = await supabase.storage.from(PHOTO_BUCKET).createSignedUrl(familyData.death_certificate_path, 3600);
        setDeathCertificateUrl(deathSigned?.signedUrl || "");
      }

      setLoading(false);
    };

    load();
  }, [id]);

  if (loading) return <div className="container" style={{ padding: 40 }}>جاري التحميل...</div>;
  if (!child) return <div className="container" style={{ padding: 40 }}>المستفيد غير موجود.</div>;

  const familyLabel = family?.family_status === "normal" ? "عادية" : family?.family_status === "siblings" ? "إخوة" : "يتيم";

  const handleBack = () => {
    // نرجع لنفس صفحة الإدارة السابقة، مع الاحتفاظ بالحالة المحفوظة في sessionStorage.
    if (window.history.length > 1) {
      navigate(-1);
      return;
    }

    navigate("/admin");
  };

  return (
    <main className="container" style={{ padding: "30px 0 60px" }} dir="rtl">
      <div style={{ display: "flex", justifyContent: "space-between", gap: 12, flexWrap: "wrap", marginBottom: 18 }}>
        <div>
          <div className="muted">ملف الأسرة #{family?.registration_number || "—"}</div>
          <h1 style={{ margin: 0 }}>{child.full_name}</h1>
          <div className="muted">المستفيد رقم {child.child_order}</div>
        </div>
        <div style={{ display: "flex", gap: 8 }}>
          <button className="btn btn-primary" onClick={() => printBeneficiaryPdf(siblings)}>طباعة ملفات الأسرة</button>
          <button type="button" className="btn btn-ghost" onClick={handleBack}>رجوع للطلبات</button>
        </div>
      </div>

      <div className="card" style={{ padding: 24 }}>
        {photo && <img src={photo} alt="صورة المستفيد" style={{ width: 140, height: 170, objectFit: "cover", borderRadius: 12, marginBottom: 20 }} />}

        <Section
          title="معلومات المستفيد"
          items={[
            ["الاسم الكامل", child.full_name],
            ["المستوى الدراسي", child.education_level],
            ["رقم القسم", child.class_number],
            ["المؤسسة", child.school],
            ["تاريخ الازدياد", child.birth_date || ""],
            ["مكان الازدياد", child.birth_place],
            ["رقم الهاتف", child.phone],
            ["العنوان", child.address],
            ["رقم مسار", child.route_number],
            ["رقم الحافلة المستعملة", child.bus_number],
            ["رقم محطة الوقوف", child.bus_stop_number],
          ]}
        />

        <Section
          title="معلومات ولي الأمر"
          items={[
            ["الاسم", child.guardian_name],
            ["الهاتف", child.guardian_phone],
            ["العنوان", child.guardian_address],
            ["حامل البطاقة", child.guardian_id_type],
            ["صلة القرابة", child.guardian_id_type === "آخر" ? child.guardian_relation : ""],
            ["CIN", child.guardian_cin],
            ["الحالة الأسرية", familyLabel],
          ]}
        />

        {family?.family_status === "orphan" && family.death_certificate_path && (
          <div style={{ marginTop: 10, padding: 16, borderRadius: 12, background: "#fff7ed", display: "flex", justifyContent: "space-between", gap: 12, alignItems: "center", flexWrap: "wrap" }}>
            <div>
              <strong>شهادة الوفاة</strong>
              <div className="muted" style={{ marginTop: 4 }}>يمكن للإدارة فتح الشهادة والتحقق من صحتها.</div>
            </div>
            {deathCertificateUrl && (
              <a className="btn btn-secondary" href={deathCertificateUrl} target="_blank" rel="noreferrer">
                📄 فتح شهادة الوفاة
              </a>
            )}
          </div>
        )}
      </div>
    </main>
  );
}

function Section({ title, items }: { title: string; items: [string, string][] }) {
  return (
    <section style={{ marginBottom: 24 }}>
      <h2 className="section-title">{title}</h2>
      <div className="grid-2">
        {items.map(([label, value]) => (
          <div key={label} style={{ padding: "10px 0", borderBottom: "1px solid #f1f5f9" }}>
            <div className="muted" style={{ fontSize: 13 }}>{label}</div>
            <div style={{ overflowWrap: "anywhere" }}>{value || "—"}</div>
          </div>
        ))}
      </div>
    </section>
  );
}