import { useState } from "react";
import { Link } from "react-router-dom";
import { supabase } from "../lib/supabase";

type ApplicationStatus = "pending" | "approved" | "rejected";

type StatusResult = {
  found: boolean;
  status?: ApplicationStatus;
  family_status?: "normal" | "siblings" | "orphan";
  beneficiary_names?: string[];
  registration_number?: number;
  children_count?: number;
  accepted_count?: number;
  waiting_count?: number;
};

const statusText = {
  pending: "الطلب في انتظار قرار الإدارة",
  approved: "الطلب مقبول",
  rejected: "الطلب مرفوض",
} as const;

const familyStatusText = {
  normal: "حالة فرد",
  siblings: "حالة إخوة",
  orphan: "حالة يتيم",
} as const;

export default function ApplicationStatus() {
  const [number, setNumber] = useState("");
  const [result, setResult] = useState<StatusResult | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const checkStatus = async (event: React.FormEvent) => {
    event.preventDefault();

    const registrationNumber = Number(number.trim());

    setResult(null);
    setError("");

    if (!Number.isInteger(registrationNumber) || registrationNumber <= 0) {
      setError("المرجو إدخال رقم استفادة صحيح.");
      return;
    }

    setBusy(true);

    try {
      const { data, error: rpcError } = await supabase.rpc(
        "get_public_application_status",
        {
          p_registration_number: registrationNumber,
        },
      );

      if (rpcError) throw rpcError;

      if (!data?.found) {
        setError(
          "لم يتم العثور على مستفيد بهذا الرقم. المرجو التأكد من رقم الاستفادة والمحاولة مرة أخرى.",
        );
        return;
      }

      setResult(data as StatusResult);
    } catch (e) {
      console.error("PUBLIC STATUS ERROR:", e);
      setError("تعذر جلب حالة الطلب حالياً. المرجو المحاولة مرة أخرى.");
    } finally {
      setBusy(false);
    }
  };

  const pending = result?.status === "pending";
  const approved = result?.status === "approved";
  const rejected = result?.status === "rejected";

  const acceptedCount = result?.accepted_count ?? 0;
  const waitingCount = result?.waiting_count ?? 0;

  const assigned = approved && acceptedCount > 0;

  const names = result?.beneficiary_names ?? [];
  const isSiblings = result?.family_status === "siblings";

  return (
    <main className="status-page" dir="rtl">
      <div className="status-card">
        <Link to="/inscription" className="status-back">
          ← العودة إلى التسجيل
        </Link>

        <div className="status-brand">جمعية جسور</div>

        <h1>تتبع حالة الطلب</h1>

        <p className="status-intro">
          أدخل رقم الاستفادة لمعرفة آخر وضعية لطلبك.
        </p>

        <form onSubmit={checkStatus} className="status-form">
          <label>رقم الاستفادة</label>

          <div className="status-input-row">
            <input
              value={number}
              onChange={(e) =>
                setNumber(e.target.value.replace(/\D/g, ""))
              }
              inputMode="numeric"
              placeholder="مثال: 125"
              maxLength={12}
            />

            <button type="submit" disabled={busy}>
              {busy ? "جاري البحث..." : "بحث"}
            </button>
          </div>
        </form>

        {error && <div className="status-error">{error}</div>}

        {result && (
          <section className="timeline-card">
            <div className="status-result-head">
              <div>
                <span>رقم الاستفادة</span>
                <strong>#{result.registration_number ?? number}</strong>
              </div>

              <span
                className={`status-badge ${
                  rejected ? "danger" : approved ? "ok" : "wait"
                }`}
              >
                {statusText[result.status || "pending"]}
              </span>
            </div>

            <div className="beneficiary-identity">
              <div className="identity-label">
                {isSiblings
                  ? "المستفيدون المرتبطون بهذا الطلب"
                  : "المستفيد المقصود"}
              </div>

              <div className="identity-type">
                {result.family_status
                  ? familyStatusText[result.family_status]
                  : ""}
              </div>

              <div className="names-list">
                {names.map((name, index) => (
                  <div className="beneficiary-name" key={`${name}-${index}`}>
                    <span className="name-number">{index + 1}</span>
                    <strong>{name}</strong>
                  </div>
                ))}
              </div>
            </div>

            <div className="timeline">
              <div className="timeline-step done">
                <b>✓</b>

                <div>
                  <strong>تم تسجيل الطلب</strong>
                  <span>تم استقبال طلب الاستفادة في المنصة.</span>
                </div>
              </div>

              <div
                className={`timeline-step ${
                  pending || approved || rejected ? "done" : ""
                }`}
              >
                <b>
                  {pending || approved || rejected ? "✓" : "2"}
                </b>

                <div>
                  <strong>
                    {rejected
                      ? "تمت دراسة الطلب"
                      : approved
                        ? "تمت المصادقة على الطلب"
                        : "في انتظار قرار الإدارة"}
                  </strong>

                  <span>
                    {rejected
                      ? "لم تتم المصادقة على الطلب."
                      : approved
                        ? "تمت الموافقة على الطلب من طرف الإدارة."
                        : "الطلب ما زال قيد الدراسة من طرف الإدارة."}
                  </span>
                </div>
              </div>

              <div
                className={`timeline-step ${assigned ? "done" : ""}`}
              >
                <b>{assigned ? "✓" : "3"}</b>

                <div>
                  <strong>التخصيص للنقل المدرسي</strong>

                  <span>
                    {assigned
                      ? `${acceptedCount} مستفيد(ة) تم تخصيصه(م) للنقل المدرسي.`
                      : "يتم تحديد الاستفادة حسب المقاعد المتوفرة."}
                  </span>
                </div>
              </div>

              <div
                className={`timeline-step ${
                  approved && waitingCount === 0 ? "done" : ""
                }`}
              >
                <b>
                  {approved && waitingCount === 0 ? "✓" : "4"}
                </b>

                <div>
                  <strong>الاستفادة النهائية</strong>

                  <span>
                    {approved
                      ? waitingCount > 0
                        ? `${waitingCount} مستفيد(ة) ما زال في قائمة الانتظار.`
                        : "تمت المصادقة النهائية والطلب جاهز للاستفادة."
                      : "تظهر حالة الاستفادة النهائية بعد المصادقة على الطلب."}
                  </span>
                </div>
              </div>
            </div>

            <div className="status-safe-note">
              ℹ️ تظهر أسماء المستفيدين فقط للتأكد من أن رقم الاستفادة المدخل
              يخص الطلب المطلوب.
            </div>
          </section>
        )}
      </div>

      <style>{`
        .status-page {
          min-height: 100vh;
          background: #f4f7f8;
          padding: 34px 16px;
          color: #17202a;
        }

        .status-card {
          max-width: 760px;
          margin: 0 auto;
          background: #fff;
          border: 1px solid #e5eaee;
          border-radius: 20px;
          padding: 28px;
          box-shadow: 0 8px 30px rgba(15,23,42,.05);
        }

        .status-back {
          display: inline-block;
          text-decoration: none;
          color: #64748b;
          font-size: 13px;
          margin-bottom: 24px;
        }

        .status-brand {
          color: #0f766e;
          font-weight: 900;
          font-size: 14px;
        }

        .status-card h1 {
          margin: 5px 0;
          font-size: 30px;
        }

        .status-intro {
          margin: 0 0 24px;
          color: #64748b;
        }

        .status-form label {
          display: block;
          font-weight: 800;
          margin-bottom: 7px;
        }

        .status-input-row {
          display: flex;
          gap: 8px;
        }

        .status-input-row input {
          flex: 1;
          border: 1px solid #dfe6eb;
          border-radius: 11px;
          padding: 13px;
          font-family: inherit;
          font-size: 15px;
          outline: none;
        }

        .status-input-row input:focus {
          border-color: #0f766e;
        }

        .status-input-row button {
          border: 0;
          background: #0f766e;
          color: #fff;
          border-radius: 11px;
          padding: 0 20px;
          font-family: inherit;
          font-weight: 900;
          cursor: pointer;
        }

        .status-input-row button:disabled {
          opacity: .6;
          cursor: not-allowed;
        }

        .status-error {
          margin-top: 14px;
          background: #fff1f2;
          color: #b91c1c;
          border: 1px solid #fecdd3;
          padding: 11px 13px;
          border-radius: 10px;
        }

        .timeline-card {
          margin-top: 20px;
          background: #f8fafc;
          border: 1px solid #e5eaee;
          border-radius: 15px;
          padding: 18px;
        }

        .status-result-head {
          display: flex;
          justify-content: space-between;
          align-items: center;
          gap: 12px;
        }

        .status-result-head span {
          display: block;
          color: #64748b;
          font-size: 12px;
        }

        .status-result-head strong {
          font-size: 24px;
        }

        .status-badge {
          display: inline-flex;
          padding: 8px 12px;
          border-radius: 999px;
          font-size: 12px;
          font-weight: 900;
        }

        .status-badge.ok {
          background: #dcfce7;
          color: #15803d;
        }

        .status-badge.wait {
          background: #ffedd5;
          color: #c2410c;
        }

        .status-badge.danger {
          background: #fee2e2;
          color: #b91c1c;
        }

        .beneficiary-identity {
          margin-top: 18px;
          padding: 16px;
          background: #ffffff;
          border: 1px solid #dbe4e8;
          border-radius: 14px;
        }

        .identity-label {
          font-size: 12px;
          color: #64748b;
          font-weight: 800;
        }

        .identity-type {
          display: inline-flex;
          margin-top: 6px;
          padding: 5px 10px;
          border-radius: 999px;
          background: #ecfdf5;
          color: #0f766e;
          font-size: 12px;
          font-weight: 900;
        }

        .names-list {
          display: grid;
          gap: 9px;
          margin-top: 13px;
        }

        .beneficiary-name {
          display: flex;
          align-items: center;
          gap: 10px;
          background: #f8fafc;
          border: 1px solid #e5eaee;
          border-radius: 10px;
          padding: 11px;
        }

        .name-number {
          width: 28px;
          height: 28px;
          border-radius: 50%;
          background: #0f766e;
          color: white;
          display: grid;
          place-items: center;
          font-size: 12px;
          font-weight: 900;
        }

        .beneficiary-name strong {
          font-size: 15px;
        }

        .timeline {
          margin-top: 18px;
          display: grid;
          gap: 0;
        }

        .timeline-step {
          display: grid;
          grid-template-columns: 34px 1fr;
          gap: 10px;
          position: relative;
          padding: 0 0 18px;
        }

        .timeline-step:not(:last-child)::after {
          content: "";
          position: absolute;
          right: 16px;
          top: 30px;
          bottom: 0;
          width: 2px;
          background: #dbe4e8;
        }

        .timeline-step b {
          width: 30px;
          height: 30px;
          border-radius: 50%;
          background: #e2e8f0;
          color: #64748b;
          display: grid;
          place-items: center;
          z-index: 1;
        }

        .timeline-step.done b {
          background: #0f766e;
          color: #fff;
        }

        .timeline-step strong {
          display: block;
          font-size: 14px;
        }

        .timeline-step span {
          display: block;
          color: #64748b;
          font-size: 12px;
          line-height: 1.6;
          margin-top: 3px;
        }

        .status-safe-note {
          margin-top: 5px;
          background: #ecfdf5;
          color: #166534;
          border-radius: 10px;
          padding: 10px 12px;
          font-size: 12px;
        }

        @media (max-width: 600px) {
          .status-card {
            padding: 20px;
          }

          .status-input-row {
            flex-direction: column;
          }

          .status-input-row button {
            padding: 12px;
          }

          .status-result-head {
            align-items: flex-start;
            flex-direction: column;
          }
        }
      `}</style>
    </main>
  );
}