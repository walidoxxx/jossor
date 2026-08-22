import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase, PHOTO_BUCKET } from "../lib/supabase";
import { validateCIN, validateImage, validateMoroccanPhone } from "../lib/validation";
import type { Beneficiary, Family, FamilyStatus, GuardianIdType } from "../types/beneficiary";

type ChildForm = {
  id: string;
  full_name: string;
  education_level: string;
  class_number: string;
  school: string;
  birth_date: string;
  birth_place: string;
  phone: string;
  gender: "ذكر" | "أنثى";
  address: string;
  route_number: string;
  bus_number: string;
  bus_stop_number: string;
  photo: File | null;
  preview: string;
};

type GuardianForm = {
  name: string;
  phone: string;
  address: string;
  id_type: GuardianIdType;
  other_relation: string;
  cin: string;
  family_status: FamilyStatus;
  children_count: 1 | 2 | 3;
  death_certificate: File | null;
};

const educationLevels = [
  "أولى إعدادي",
  "ثانية إعدادي",
  "الثالثة إعدادي",
  "جذع مشترك",
  "أولى باك",
  "ثانية باك",
];

const schools = [
  "الثانوية التأهيلية عبد الله الشفشاوني",
  "الثانوية التأهيلية ابن زيدون",
  "الثانوية التأهيلية المهدي المنجرة",
  "الثانوية التأهيلية يوسف بن تاشفين",
  "الثانوية الإعدادية الإمام الجزولي",
  "الثانوية التأهيلية المجد",
];

const busCapacities: Record<string, number> = {
  "1": 400,
  "2": 80,
  "3": 60,
  "4": 120,
  "5": 160,
  "6": 150,
  "7": 100,
};

const busNumbers = Object.keys(busCapacities);

function fileToDataUrl(file: File | null): Promise<string> {
  if (!file) return Promise.resolve("");

  return new Promise((resolve, reject) => {
    const reader = new FileReader();

    reader.onload = () => resolve(typeof reader.result === "string" ? reader.result : "");
    reader.onerror = () => reject(new Error("تعذر تجهيز صورة المستفيد للوثائق."));
    reader.readAsDataURL(file);
  });
}

const makeChild = (): ChildForm => ({
  id: crypto.randomUUID(),
  full_name: "",
  education_level: "",
  class_number: "",
  school: "",
  birth_date: "",
  birth_place: "",
  phone: "",
  gender: "ذكر",
  address: "",
  route_number: "",
  bus_number: "",
  bus_stop_number: "",
  photo: null,
  preview: "",
});

const initialGuardian: GuardianForm = {
  name: "",
  phone: "",
  address: "",
  id_type: "أب",
  other_relation: "",
  cin: "",
  family_status: "normal",
  children_count: 1,
  death_certificate: null,
};

export default function RegistrationForm() {
  const navigate = useNavigate();
  const [guardian, setGuardian] = useState<GuardianForm>(initialGuardian);
  const [children, setChildren] = useState<ChildForm[]>([makeChild()]);
  const [step, setStep] = useState(1);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [registrationOpen, setRegistrationOpen] = useState(true);
  const [registrationChecking, setRegistrationChecking] = useState(true);

  useEffect(() => {
    let cancelled = false;

    supabase.rpc("get_registration_status").then(({ data, error: statusError }) => {
      if (cancelled) return;

      if (!statusError && typeof data === "boolean") {
        setRegistrationOpen(data);
      } else {
        // Keep the form usable if the status-check RPC is temporarily unavailable.
        setRegistrationOpen(true);
      }

      setRegistrationChecking(false);
    });

    return () => {
      cancelled = true;
    };
  }, []);

  const familyLabel =
    guardian.family_status === "normal"
      ? "عادية"
      : guardian.family_status === "siblings"
        ? "إخوة"
        : "يتيم";

  const setGuardianValue = <K extends keyof GuardianForm>(
    key: K,
    value: GuardianForm[K],
  ) => {
    setGuardian((current) => ({ ...current, [key]: value }));
  };

  const updateChild = <K extends keyof ChildForm>(
    index: number,
    key: K,
    value: ChildForm[K],
  ) => {
    setChildren((current) =>
      current.map((child, i) =>
        i === index ? { ...child, [key]: value } : child,
      ),
    );
  };

  const changeFamilyStatus = (status: FamilyStatus) => {
    setGuardian((current) => ({
      ...current,
      family_status: status,
      children_count:
        status === "siblings"
          ? current.children_count === 1
            ? 2
            : current.children_count
          : 1,
    }));

    setChildren((current) =>
      status === "siblings"
        ? current.length >= 2
          ? current
          : [...current, makeChild()]
        : [current[0] || makeChild()],
    );
  };

  const changeChildrenCount = (count: 2 | 3) => {
    setGuardian((current) => ({
      ...current,
      children_count: count,
      family_status: "siblings",
    }));

    setChildren((current) => {
      const next = [...current];
      while (next.length < count) next.push(makeChild());
      return next.slice(0, count);
    });
  };

  const changeChildPhoto = (index: number, file: File | null) => {
    const oldPreview = children[index]?.preview;
    if (oldPreview) URL.revokeObjectURL(oldPreview);
    updateChild(index, "photo", file);
    updateChild(index, "preview", file ? URL.createObjectURL(file) : "");
  };

  const stepNext = () => {
    setError("");

    if (step === 1) {
      if (
        !guardian.name.trim() ||
        !guardian.phone.trim() ||
        !guardian.cin.trim() ||
        !guardian.address.trim()
      ) {
        return setError("المرجو إكمال معلومات ولي الأمر.");
      }
      if (!validateMoroccanPhone(guardian.phone)) {
        return setError("رقم هاتف ولي الأمر غير صحيح.");
      }
      if (!validateCIN(guardian.cin)) {
        return setError("رقم البطاقة الوطنية غير صحيح.");
      }
      if (guardian.id_type === "آخر" && !guardian.other_relation.trim()) {
        return setError("المرجو تحديد صلة القرابة مع المستفيد.");
      }
      if (guardian.family_status === "orphan" && !guardian.death_certificate) {
        return setError("المرجو رفع شهادة الوفاة في حالة يتيم.");
      }
      if (guardian.family_status === "siblings" && guardian.children_count < 2) {
        return setError("اختر عدد الأبناء: 2 أو 3.");
      }
      return setStep(2);
    }

    if (step === 2) {
      for (let i = 0; i < children.length; i++) {
        const child = children[i];
        if (
          !child.full_name.trim() ||
          !child.education_level ||
          !child.class_number.trim() ||
          !child.school ||
          !child.birth_date ||
          !child.birth_place.trim() ||
          !child.phone.trim() ||
          !child.gender ||
          !child.address.trim() ||
          !child.route_number.trim() ||
          !child.photo
        ) {
          return setError(`المرجو إكمال جميع معلومات المستفيد رقم ${i + 1}، بما فيها الصورة الشخصية.`);
        }
        if (!validateMoroccanPhone(child.phone)) {
          return setError(`رقم هاتف المستفيد رقم ${i + 1} غير صحيح.`);
        }
        const imageError = validateImage(child.photo);
        if (imageError) {
          return setError(`صورة المستفيد رقم ${i + 1}: ${imageError}`);
        }
      }
      return setStep(3);
    }

    if (step === 3) {
      for (let i = 0; i < children.length; i++) {
        if (!children[i].bus_number) {
          return setError(`المرجو اختيار رقم الحافلة للمستفيد رقم ${i + 1}.`);
        }
        if (!children[i].bus_stop_number) {
          return setError(`المرجو إدخال رقم محطة الوقوف للمستفيد رقم ${i + 1}.`);
        }
      }
      return setStep(4);
    }
  };

  const submit = async () => {
    setError("");
    setBusy(true);

    try {
      const { data: isOpen, error: statusError } = await supabase.rpc("get_registration_status");

      if (statusError) {
        throw statusError;
      }

      if (isOpen !== true) {
        throw new Error("التسجيل مغلق حالياً. انتهت فترة التسجيل.");
      }

      const familyId = crypto.randomUUID();
      const childPayload: Array<Record<string, unknown>> = [];

      for (const child of children) {
        let photoPath: string | null = null;

        if (child.photo) {
          const ext = child.photo.name.split(".").pop()?.toLowerCase() || "jpg";
          photoPath = `pending/${familyId}/${child.id}.${ext}`;
          const { error: uploadError } = await supabase.storage
            .from(PHOTO_BUCKET)
            .upload(photoPath, child.photo, {
              upsert: false,
              contentType: child.photo.type,
            });
          if (uploadError) {
            throw new Error(`فشل رفع صورة ${child.full_name}: ${uploadError.message}`);
          }
        }

        childPayload.push({
          id: child.id,
          full_name: child.full_name,
          education_level: child.education_level,
          class_number: child.class_number,
          school: child.school,
          birth_date: child.birth_date || null,
          birth_place: child.birth_place,
          phone: child.phone,
          gender: child.gender,
          address: child.address,
          photo_path: photoPath,
          route_number: child.route_number,
          bus_number: child.bus_number,
          bus_stop_number: child.bus_stop_number,
        });
      }

      let deathCertificatePath: string | null = null;
      if (guardian.death_certificate) {
        const ext = guardian.death_certificate.name.split(".").pop()?.toLowerCase() || "jpg";
        deathCertificatePath = `pending/${familyId}/death-certificate.${ext}`;
        const { error: uploadError } = await supabase.storage
          .from(PHOTO_BUCKET)
          .upload(deathCertificatePath, guardian.death_certificate, {
            upsert: false,
            contentType: guardian.death_certificate.type,
          });
        if (uploadError) {
          throw new Error(`فشل رفع شهادة الوفاة: ${uploadError.message}`);
        }
      }

      const { data, error: rpcError } = await supabase.rpc("register_family", {
        p_family_id: familyId,
        p_guardian_name: guardian.name,
        p_guardian_phone: guardian.phone,
        p_guardian_address: guardian.address,
        p_guardian_id_type: guardian.id_type,
        p_guardian_relation: guardian.id_type === "آخر" ? guardian.other_relation : null,
        p_guardian_cin: guardian.cin,
        p_family_status: guardian.family_status,
        p_children_count: guardian.children_count,
        p_death_certificate_path: deathCertificatePath,
        p_children: childPayload,
      });

      if (rpcError) throw rpcError;

      const result = Array.isArray(data) ? data[0] : data;
      if (!result?.family_id || !result?.family_registration_number) {
        throw new Error("تعذر إنشاء ملف الأسرة.");
      }

      const beneficiaries: Beneficiary[] = children.map((child, index) => ({
        id: child.id,
        family_id: familyId,
        registration_number: Number(result.registration_numbers?.[index] || 0),
        child_order: index + 1,
        full_name: child.full_name,
        education_level: child.education_level,
        class_number: child.class_number,
        school: child.school,
        birth_date: child.birth_date || null,
        birth_place: child.birth_place,
        phone: child.phone,
        gender: child.gender,
        address: child.address,
        photo_path: childPayload[index].photo_path as string | null,
        guardian_name: guardian.name,
        guardian_phone: guardian.phone,
        guardian_address: guardian.address,
        guardian_id_type: guardian.id_type,
        guardian_relation: guardian.id_type === "آخر" ? guardian.other_relation : "",
        guardian_cin: guardian.cin.toUpperCase(),
        route_number: child.route_number,
        bus_number: child.bus_number,
        bus_stop_number: child.bus_stop_number,
        line_status: "waiting",
        status: "pending",
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      }));

      const family: Family = {
        id: familyId,
        registration_number: Number(result.family_registration_number),
        guardian_name: guardian.name,
        guardian_phone: guardian.phone,
        guardian_address: guardian.address,
        guardian_id_type: guardian.id_type,
        guardian_relation: guardian.id_type === "آخر" ? guardian.other_relation : "",
        guardian_cin: guardian.cin.toUpperCase(),
        family_status: guardian.family_status,
        children_count: guardian.children_count,
        death_certificate_path: deathCertificatePath,
        registration_fee: Number(result.registration_fee ?? 0),
        status: "pending",
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };

      const photoDataUrls = await Promise.all(
        children.map((child) => fileToDataUrl(child.photo)),
      );

      navigate(`/success/${family.registration_number}`, {
        state: {
          family,
          beneficiaries,
          photoDataUrls,
        },
      });
    } catch (e: any) {
      console.error("FAMILY REGISTRATION ERROR:", e);
      setError(e?.message || "وقع خطأ أثناء التسجيل.");
    } finally {
      setBusy(false);
    }
  };

  if (registrationChecking) {
    return (
      <div className="card" dir="rtl" style={{ padding: 34, textAlign: "center" }}>
        <div style={{ fontSize: 42, marginBottom: 10 }}>⏳</div>
        <h2 style={{ margin: "0 0 8px" }}>جاري التحقق من حالة التسجيل</h2>
        <p className="muted" style={{ margin: 0 }}>
          المرجو الانتظار قليلاً...
        </p>
      </div>
    );
  }

  if (!registrationOpen) {
    return (
      <div className="card" dir="rtl" style={{ padding: 34, textAlign: "center" }}>
        <div
          style={{
            width: 74,
            height: 74,
            margin: "0 auto 16px",
            borderRadius: "50%",
            background: "#fff7ed",
            color: "#c2410c",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontSize: 34,
          }}
        >
          🔒
        </div>

        <h2 style={{ margin: "0 0 10px", color: "#0f172a" }}>
          التسجيل مغلق حالياً
        </h2>

        <p
          style={{
            maxWidth: 560,
            margin: "0 auto 20px",
            color: "#64748b",
            lineHeight: 1.9,
          }}
        >
          نعتذر، لقد انتهت فترة التسجيل الخاصة بالنقل المدرسي.
          لا يمكن حالياً إيداع طلبات جديدة عبر المنصة.
        </p>

        <div
          style={{
            background: "#f8fafc",
            border: "1px solid #e2e8f0",
            borderRadius: 12,
            padding: 14,
            color: "#475569",
            fontSize: 13,
            marginBottom: 18,
          }}
        >
          سيتم الإعلان عن موعد فتح التسجيل من طرف جمعية جسور.
        </div>

        <div
          style={{
            display: "flex",
            flexWrap: "wrap",
            gap: 8,
            justifyContent: "center",
          }}
        >
          <button
            className="btn btn-primary"
            type="button"
            onClick={() => navigate("/status")}
          >
            🔎 تتبع ملفي
          </button>

          <button
            className="btn btn-ghost"
            type="button"
            onClick={() => navigate("/")}
          >
            🏠 العودة للرئيسية
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="card" style={{ padding: 24 }} dir="rtl">
      <div style={{ display: "flex", gap: 8, marginBottom: 24 }}>
        {["ولي الأمر", "المستفيدون", "النقل", "المراجعة"].map((label, index) => (
          <div key={label} style={{ flex: 1, textAlign: "center" }}>
            <div
              style={{
                height: 6,
                borderRadius: 9,
                background: index + 1 <= step ? "#0f766e" : "#e2e8f0",
              }}
            />
            <small className={index + 1 === step ? "" : "muted"}>{label}</small>
          </div>
        ))}
      </div>

      <div
        style={{
          background: "#fff7ed",
          border: "1px solid #fed7aa",
          borderRadius: 14,
          padding: "16px 18px",
          marginBottom: 18,
          color: "#7c2d12",
          lineHeight: 1.8,
        }}
      >
        <div
          style={{
            fontWeight: 800,
            fontSize: 16,
            marginBottom: 6,
          }}
        >
          ملاحظة هامة
        </div>
        <div style={{ fontSize: 14 }}>
          بمجرد إتمام التسجيل عبر هذه المنصة، يتعين على المعني بالأمر طباعة الوثائق الناتجة عن التسجيل وإيداعها لدى إدارة الجمعية داخل أجل لا يتجاوز ثلاثة (3) أيام من تاريخ التسجيل، وإلا اعتُبر الطلب ملغى.
        </div>
        <div style={{ fontSize: 14, marginTop: 6 }}>
          ولا يُعتبر التسجيل نهائياً ومكتملًا إلا بعد إيداع الوثائق المطلوبة والحصول على وصل الاستفادة المسلم من طرف إدارة الجمعية.
        </div>
      </div>

      {error && (
        <div
          className="error"
          style={{ background: "#fff1f2", padding: 12, borderRadius: 10, marginBottom: 16 }}
        >
          {error}
        </div>
      )}

      {step === 1 && (
        <section>
          <h2 className="section-title">معلومات ولي الأمر</h2>
          <div className="grid-2">
            <Field label="الاسم الكامل لولي الأمر *">
              <input value={guardian.name} onChange={(e) => setGuardianValue("name", e.target.value)} />
            </Field>

            <Field label="رقم الهاتف *">
              <input inputMode="tel" value={guardian.phone} onChange={(e) => setGuardianValue("phone", e.target.value)} />
            </Field>

            <Field label="حامل البطاقة الوطنية *">
              <select
                value={guardian.id_type}
                onChange={(e) => setGuardianValue("id_type", e.target.value as GuardianIdType)}
              >
                <option value="أب">أب</option>
                <option value="أم">أم</option>
                <option value="آخر">آخر</option>
              </select>
            </Field>

            {guardian.id_type === "آخر" && (
              <Field label="صلة القرابة مع المستفيد *">
                <input
                  value={guardian.other_relation}
                  onChange={(e) => setGuardianValue("other_relation", e.target.value)}
                  placeholder="مثلاً: الجد، العم، الخال..."
                />
              </Field>
            )}

            <Field label="رقم البطاقة الوطنية *">
              <input value={guardian.cin} onChange={(e) => setGuardianValue("cin", e.target.value.toUpperCase())} />
            </Field>

            <div className="field" style={{ gridColumn: "1 / -1" }}>
              <label>العنوان *</label>
              <textarea rows={2} value={guardian.address} onChange={(e) => setGuardianValue("address", e.target.value)} />
            </div>
          </div>

          <div style={{ marginTop: 22, padding: 18, background: "#f8fafc", borderRadius: 14 }}>
            <div style={{ fontWeight: 800, marginBottom: 10 }}>الحالة</div>

            <div className="grid-3">
              {([ ["normal", "عادية"], ["siblings", "إخوة"], ["orphan", "يتيم"] ] as [FamilyStatus, string][]).map(([value, label]) => (
                <button
                  key={value}
                  type="button"
                  className="btn"
                  onClick={() => changeFamilyStatus(value)}
                  style={{
                    background: guardian.family_status === value ? "#0f766e" : "white",
                    color: guardian.family_status === value ? "white" : "#334155",
                    border: "1px solid #d9e0e5",
                  }}
                >
                  {label}
                </button>
              ))}
            </div>

            {guardian.family_status === "siblings" && (
              <div style={{ marginTop: 16 }} className="field">
                <label>عدد الأبناء <span style={{ color: "#dc2626", fontWeight: 900 }}>*</span></label>
                <select
                  value={guardian.children_count}
                  onChange={(e) => changeChildrenCount(Number(e.target.value) as 2 | 3)}
                >
                  <option value={2}>2 أبناء</option>
                  <option value={3}>3 أبناء</option>
                </select>
              </div>
            )}

            {guardian.family_status === "orphan" && (
              <div style={{ marginTop: 16 }} className="field">
                <label>صورة شهادة الوفاة *</label>
                <input
                  type="file"
                  required
                  accept="image/jpeg,image/png,image/webp,application/pdf"
                  onChange={(e) => setGuardianValue("death_certificate", e.target.files?.[0] || null)}
                />
                {guardian.death_certificate && (
                  <small className="muted">تم اختيار الشهادة: {guardian.death_certificate.name}</small>
                )}
              </div>
            )}
          </div>

          <div style={{ marginTop: 18, padding: 16, borderRadius: 12, background: "#f8fafc", color: "#334155" }}>
            الحالة المختارة: <strong>{familyLabel}</strong>
          </div>
        </section>
      )}

      {step === 2 && (
        <section>
          <h2 className="section-title">معلومات المستفيدين</h2>
          <div style={{ display: "grid", gap: 20 }}>
            {children.map((child, index) => (
              <div key={child.id} style={{ border: "1px solid #e6eaed", borderRadius: 16, padding: 18 }}>
                <h3 style={{ marginTop: 0 }}>المستفيد رقم {index + 1}</h3>

                <div className="grid-2">
                  <Field label="الاسم الكامل *">
                    <input value={child.full_name} onChange={(e) => updateChild(index, "full_name", e.target.value)} />
                  </Field>

                  <Field label="المستوى الدراسي *">
                    <select value={child.education_level} onChange={(e) => updateChild(index, "education_level", e.target.value)}>
                      <option value="">اختر المستوى الدراسي</option>
                      {educationLevels.map((level) => <option key={level}>{level}</option>)}
                    </select>
                  </Field>

                  <Field label="رقم القسم *">
                    <input value={child.class_number} onChange={(e) => updateChild(index, "class_number", e.target.value)} />
                  </Field>

                  <Field label="المؤسسة *">
                    <select value={child.school} onChange={(e) => updateChild(index, "school", e.target.value)}>
                      <option value="">اختر المؤسسة</option>
                      {schools.map((school) => <option key={school}>{school}</option>)}
                    </select>
                  </Field>

                  <Field label="تاريخ الازدياد *">
                    <input type="date" value={child.birth_date} onChange={(e) => updateChild(index, "birth_date", e.target.value)} />
                  </Field>

                  <Field label="مكان الازدياد *">
                    <input value={child.birth_place} onChange={(e) => updateChild(index, "birth_place", e.target.value)} />
                  </Field>

                  <Field label="رقم الهاتف *">
                    <input inputMode="tel" value={child.phone} onChange={(e) => updateChild(index, "phone", e.target.value)} />
                  </Field>

                  <Field label="الجنس *">
                    <select value={child.gender} onChange={(e) => updateChild(index, "gender", e.target.value as "ذكر" | "أنثى")}>
                      <option value="ذكر">ذكر</option>
                      <option value="أنثى">أنثى</option>
                    </select>
                  </Field>

                  <Field label="رقم مسار *">
                    <input value={child.route_number} onChange={(e) => updateChild(index, "route_number", e.target.value)} />
                  </Field>

                  <div className="field" style={{ gridColumn: "1 / -1" }}>
                    <label>العنوان *</label>
                    <textarea rows={2} value={child.address} onChange={(e) => updateChild(index, "address", e.target.value)} />
                  </div>

                  <div className="field" style={{ gridColumn: "1 / -1" }}>
                    <label>صورة المستفيد(ة) <span style={{ color: "#dc2626", fontWeight: 900 }}>*</span></label>
                    <input
                      type="file"
                      required
                      accept="image/jpeg,image/png,image/webp"
                      onChange={(e) => changeChildPhoto(index, e.target.files?.[0] || null)}
                    />
                    {child.preview && (
                      <img
                        src={child.preview}
                        alt="معاينة"
                        style={{ width: 110, height: 135, objectFit: "cover", borderRadius: 10, marginTop: 8 }}
                      />
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {step === 3 && (
        <section>
          <h2 className="section-title">معلومات النقل المدرسي</h2>
          <div style={{ display: "grid", gap: 16 }}>
            {children.map((child, index) => (
              <div key={child.id} style={{ border: "1px solid #e6eaed", borderRadius: 16, padding: 18 }}>
                <h3 style={{ marginTop: 0 }}>النقل للمستفيد رقم {index + 1}: {child.full_name || "بدون اسم"}</h3>

                <div className="grid-2">
                  <Field label="رقم الحافلة المستعملة *">
                    <select value={child.bus_number} onChange={(e) => updateChild(index, "bus_number", e.target.value)}>
                      <option value="">اختر رقم الحافلة</option>
                      {busNumbers.map((number) => (
                        <option key={number} value={number}>
                          الحافلة {number}
                        </option>
                      ))}
                    </select>
                  </Field>

                  <Field label="رقم محطة الوقوف *">
                    <input value={child.bus_stop_number} onChange={(e) => updateChild(index, "bus_stop_number", e.target.value)} />
                  </Field>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {step === 4 && (
        <section>
          <h2 className="section-title">مراجعة التسجيل</h2>
          <div style={{ background: "#f8fafc", borderRadius: 14, padding: 18, lineHeight: 2 }}>
            <div><b>ولي الأمر:</b> {guardian.name}</div>
            <div><b>الهاتف:</b> {guardian.phone}</div>
            <div><b>البطاقة الوطنية:</b> {guardian.cin}</div>
            <div><b>الحالة الأسرية:</b> {familyLabel}</div>
            {guardian.id_type === "آخر" && <div><b>صلة القرابة:</b> {guardian.other_relation}</div>}
            <hr />
            {children.map((child, index) => (
              <div key={child.id} style={{ marginBottom: 10 }}>
                <b>المستفيد {index + 1}:</b> {child.full_name} — {child.education_level} — {child.school} — الجنس: {child.gender} — مسار: {child.route_number} — الحافلة: {child.bus_number} — المحطة: {child.bus_stop_number}
              </div>
            ))}
          </div>
          <p className="muted" style={{ marginTop: 12 }}>بتأكيد الإرسال، أقر بصحة المعلومات المدخلة.</p>
        </section>
      )}

      <div style={{ display: "flex", justifyContent: "space-between", marginTop: 24 }}>
        <button className="btn btn-ghost" disabled={step === 1 || busy} onClick={() => setStep((current) => current - 1)}>
          السابق
        </button>

        {step < 4 ? (
          <button className="btn btn-primary" disabled={busy} onClick={stepNext}>التالي</button>
        ) : (
          <button className="btn btn-primary" disabled={busy} onClick={submit}>
            {busy ? "جاري الإرسال..." : "تأكيد وإرسال التسجيل"}
          </button>
        )}
      </div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  const required = label.trim().endsWith("*");
  const cleanLabel = required ? label.trim().slice(0, -1).trimEnd() : label;

  return (
    <div className="field">
      <label>
        {cleanLabel}
        {required && (
          <span
            aria-label="حقل إجباري"
            title="حقل إجباري"
            style={{
              color: "#dc2626",
              marginRight: 4,
              fontWeight: 900,
            }}
          >
            *
          </span>
        )}
      </label>
      {children}
    </div>
  );
}