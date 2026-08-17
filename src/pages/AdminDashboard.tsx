import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { supabase, PHOTO_BUCKET } from "../lib/supabase";
import { printBeneficiaryPdf } from "../lib/pdf";
import type { Beneficiary, Family, FamilyStatus } from "../types/beneficiary";

const BUS_CAPACITIES: Record<string, number> = {
  "1": 400,
  "2": 80,
  "3": 60,
  "4": 120,
  "5": 160,
  "6": 150,
  "7": 100,
};

const BUS_NUMBERS = Object.keys(BUS_CAPACITIES);
type FamilyRow = Family & { beneficiaries: Beneficiary[] };
type StatusFilter = "all" | "pending" | "approved" | "rejected";
type DashboardTab = "overview" | "families" | "lines";

function familyLabel(v: FamilyStatus) {
  return v === "normal" ? "عادية" : v === "siblings" ? "إخوة" : "يتيم";
}

function statusLabel(v: Family["status"]) {
  return v === "approved" ? "مقبول" : v === "rejected" ? "مرفوض" : "في الانتظار";
}

function statusClass(v: Family["status"]) {
  return v === "approved" ? "ok" : v === "rejected" ? "danger" : "wait";
}

function spreadsheetCell(value: string | number | null | undefined) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

function downloadExcel(
  fileName: string,
  title: string,
  subtitle: string,
  rows: Array<Array<string | number | null | undefined>>,
) {
  const header = rows[0] || [];
  const body = rows.slice(1);

  const widths = [
    "7%",
    "10%",
    "18%",
    "17%",
    "12%",
    "12%",
    "9%",
    "9%",
    "20%",
    "10%",
  ];

  const headerHtml = header
    .map(
      (cell, index) => `
        <th style="
          width:${widths[index] || "10%"};
          background:#0f766e;
          color:#ffffff;
          font-weight:700;
          font-size:14px;
          padding:10px 8px;
          border:1px solid #94a3b8;
          text-align:center;
          vertical-align:middle;
          white-space:nowrap;
        ">${spreadsheetCell(cell)}</th>
      `,
    )
    .join("");

  const bodyHtml = body
    .map(
      (row, rowIndex) => `
        <tr>
          ${row
            .map(
              (cell, index) => `
                <td style="
                  width:${widths[index] || "10%"};
                  background:${rowIndex % 2 === 0 ? "#f8fafc" : "#ffffff"};
                  color:#1e293b;
                  font-size:13px;
                  padding:9px 8px;
                  border:1px solid #cbd5e1;
                  text-align:center;
                  vertical-align:middle;
                  white-space:normal;
                ">${spreadsheetCell(cell)}</td>
              `,
            )
            .join("")}
        </tr>
      `,
    )
    .join("");

  const html = `
    <html>
      <head>
        <meta charset="UTF-8" />
        <style>
          @page {
            size: A4 landscape;
            margin: 12mm;
          }

          body {
            font-family: Arial, Tahoma, sans-serif;
            direction: rtl;
            margin: 0;
            padding: 0;
            background: #ffffff;
            color: #0f172a;
          }

          table {
            width: 100%;
            border-collapse: collapse;
            table-layout: fixed;
            direction: rtl;
          }

          .title {
            background: #ffffff;
            color: #0f172a;
            font-size: 20px;
            font-weight: 800;
            text-align: center;
            padding: 14px;
            border: 1px solid #94a3b8;
          }

          .subtitle {
            background: #ecfdf5;
            color: #475569;
            font-size: 12px;
            text-align: center;
            padding: 8px;
            border: 1px solid #cbd5e1;
          }

          .spacer td {
            border: 0;
            height: 8px;
          }
        </style>
      </head>

      <body>
        <table>
          <tr>
            <td colspan="${header.length}" class="title">
              ${spreadsheetCell(title)}
            </td>
          </tr>

          <tr>
            <td colspan="${header.length}" class="subtitle">
              ${spreadsheetCell(subtitle)}
            </td>
          </tr>

          <tr class="spacer">
            ${header.map(() => "<td></td>").join("")}
          </tr>

          <tr>
            ${headerHtml}
          </tr>

          ${bodyHtml}
        </table>
      </body>
    </html>
  `.trim();

  const blob = new Blob(["\uFEFF", html], {
    type: "application/vnd.ms-excel;charset=utf-8;",
  });

  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");

  anchor.href = url;
  anchor.download = fileName.endsWith(".xls")
    ? fileName
    : `${fileName}.xls`;

  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();

  URL.revokeObjectURL(url);
}

export default function AdminDashboard() {
  const [families, setFamilies] = useState<FamilyRow[]>([]);
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState<StatusFilter>("all");
  const [tab, setTab] = useState<DashboardTab>("overview");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [busyId, setBusyId] = useState<string | null>(null);
  const [openLine, setOpenLine] = useState<string | null>(null);

  const load = async () => {
    setLoading(true);
    setError("");

    const [familyResult, childResult] = await Promise.all([
      supabase.from("families").select("*").order("created_at", { ascending: false }),
      supabase.from("beneficiaries").select("*").order("child_order", { ascending: true }),
    ]);

    if (familyResult.error || childResult.error) {
      setError(familyResult.error?.message || childResult.error?.message || "تعذر تحميل الملفات.");
    } else {
      const children = (childResult.data || []) as Beneficiary[];
      setFamilies(
        ((familyResult.data || []) as Family[]).map((family) => ({
          ...family,
          beneficiaries: children
            .filter((child) => child.family_id === family.id)
            .sort((a, b) => a.child_order - b.child_order),
        })),
      );
    }

    setLoading(false);
  };

  useEffect(() => {
    void load();
  }, []);

  // في حالتي "في الانتظار" و"مرفوضة" نعرض للعامل الإداري
  // صفحة "الطلبات" فقط، ونخفي "الرئيسية" و"الخطوط".
  useEffect(() => {
    if (status === "pending" || status === "rejected") {
      setTab("families");
    }
  }, [status]);

  const canShowOverviewAndLines =
    status === "all" || status === "approved";

  const counts = useMemo(
    () => ({
      all: families.length,
      pending: families.filter((f) => f.status === "pending").length,
      approved: families.filter((f) => f.status === "approved").length,
      rejected: families.filter((f) => f.status === "rejected").length,
    }),
    [families],
  );

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();

    return families.filter((family) => {
      if (status !== "all" && family.status !== status) return false;
      if (!q) return true;

      const hay = [
        family.guardian_name,
        family.guardian_phone,
        family.guardian_cin,
        family.registration_number,
        family.family_status,
        family.guardian_relation,
        ...family.beneficiaries.flatMap((b) => [
          b.full_name,
          b.phone,
          b.school,
          b.route_number,
          b.bus_number,
          b.bus_stop_number,
          b.registration_number,
        ]),
      ];

      return hay.some((value) => String(value ?? "").toLowerCase().includes(q));
    });
  }, [families, search, status]);

  const lineBoard = useMemo(() => {
    return BUS_NUMBERS.map((line) => {
      const onLine = families
        .flatMap((family) => family.beneficiaries.map((child) => ({ child, family })))
        .filter(({ family, child }) => family.status === "approved" && child.status === "approved" && child.bus_number === line)
        .sort((a, b) => {
          const ca = new Date(a.child.created_at).getTime();
          const cb = new Date(b.child.created_at).getTime();
          if (ca !== cb) return ca - cb;
          return a.child.registration_number - b.child.registration_number;
        });

      const capacity = BUS_CAPACITIES[line];
      const accepted = onLine.filter(({ child }) => child.line_status === "accepted");
      const waiting = onLine.filter(({ child }) => child.line_status === "waiting");

      return {
        line,
        capacity,
        accepted,
        waiting,
        occupied: accepted.length,
        free: Math.max(capacity - accepted.length, 0),
      };
    });
  }, [families]);

  const updateFamilyStatus = async (family: FamilyRow, next: Family["status"]) => {
    setBusyId(family.id);
    setError("");

    const { error } = await supabase.rpc("set_family_status", {
      p_family_id: family.id,
      p_status: next,
    });

    if (error) {
      setError(error.message);
      setBusyId(null);
      return;
    }

    await load();
    setBusyId(null);
  };

  const updateLineStatus = async (childId: string, next: "accepted" | "waiting") => {
    setBusyId(childId);
    setError("");

    const functionName = next === "accepted" ? "accept_beneficiary_on_line" : "move_beneficiary_to_waiting";

    const { error } = await supabase.rpc(functionName, {
      p_beneficiary_id: childId,
    });

    if (error) {
      setError(error.message);
      setBusyId(null);
      return;
    }

    await load();
    setBusyId(null);
  };

  const deleteFamily = async (family: FamilyRow) => {
    const confirmed = window.confirm(
      `واش متأكد بغيتي تمسح ملف الطلب #${family.registration_number} ديال ${family.guardian_name}؟\n\nالعملية نهائية.`,
    );
    if (!confirmed) return;

    setBusyId(family.id);
    setError("");

    const paths = [family.death_certificate_path, ...family.beneficiaries.map((child) => child.photo_path)].filter(Boolean) as string[];

    const { error } = await supabase.from("families").delete().eq("id", family.id);

    if (error) {
      setError(error.message);
      setBusyId(null);
      return;
    }

    if (paths.length) {
      await supabase.storage.from(PHOTO_BUCKET).remove(paths);
    }

    setFamilies((current) => current.filter((item) => item.id !== family.id));
    setBusyId(null);
  };

  const exportLine = (line: string, mode: "accepted" | "waiting") => {
    const board = lineBoard.find((item) => item.line === line);
    if (!board) return;

    const list = mode === "accepted" ? board.accepted : board.waiting;
    const rows: Array<Array<string | number>> = [
      ["ترتيب اللائحة", "رقم التسجيل", "المستفيد", "ولي الأمر", "الهاتف", "رقم مسار", "الحافلة", "المحطة", "المؤسسة", "الحالة"],
      ...list.map(({ child, family }, index) => [
        index + 1,
        child.registration_number,
        child.full_name,
        family.guardian_name,
        child.phone,
        child.route_number,
        child.bus_number,
        child.bus_stop_number,
        child.school,
        mode === "accepted" ? "مقبول" : `انتظار ${index + 1}`,
      ]),
    ];

    const title = mode === "accepted"
      ? `لائحة المقبولين — الخط رقم ${line}`
      : `لائحة الانتظار — الخط رقم ${line}`;

    const subtitle = `جمعية جسور لتنمية النقل المدرسي بالتمسية — عدد المسجلين في اللائحة: ${list.length}`;

    downloadExcel(
      `jossour-${mode}-line-${line}.xls`,
      title,
      subtitle,
      rows,
    );
  };

  if (loading) {
    return <div className="admin-shell" dir="rtl"><div className="loading-card">جاري تحميل لوحة الإدارة...</div><DashboardStyles /></div>;
  }

  return (
    <main className="admin-shell" dir="rtl">
      <DashboardStyles />

      <header className="admin-topbar">
        <div>
          <div className="admin-brand">جمعية جسور لتنمية النقل المدرسي بالتمسية</div>
          <h1>لوحة الإدارة</h1>
          <p>كل ما تحتاجه الإدارة في مكان واحد</p>
        </div>
        <button className="admin-refresh" onClick={() => void load()}>↻ تحديث</button>
      </header>

      {error && <div className="admin-alert">{error}</div>}

      <section className="stats-row">
        <button className={`stat ${status === "all" ? "active" : ""}`} onClick={() => { setStatus("all"); setTab("families"); }}>
          <span className="stat-number">{counts.all}</span><span className="stat-label">جميع الطلبات</span>
        </button>
        <button className={`stat wait ${status === "pending" ? "active" : ""}`} onClick={() => { setStatus("pending"); setTab("families"); }}>
          <span className="stat-number">{counts.pending}</span><span className="stat-label">في الانتظار</span>
        </button>
        <button className={`stat ok ${status === "approved" ? "active" : ""}`} onClick={() => { setStatus("approved"); setTab("families"); }}>
          <span className="stat-number">{counts.approved}</span><span className="stat-label">مقبولة</span>
        </button>
        <button className={`stat danger ${status === "rejected" ? "active" : ""}`} onClick={() => { setStatus("rejected"); setTab("families"); }}>
          <span className="stat-number">{counts.rejected}</span><span className="stat-label">مرفوضة</span>
        </button>
      </section>

      <nav className="dashboard-nav">
        {canShowOverviewAndLines && (
          <button
            className={tab === "overview" ? "selected" : ""}
            onClick={() => setTab("overview")}
          >
            🏠 الرئيسية
          </button>
        )}

        <button
          className={tab === "families" ? "selected" : ""}
          onClick={() => setTab("families")}
        >
          📋 الطلبات
        </button>

        {canShowOverviewAndLines && (
          <button
            className={tab === "lines" ? "selected" : ""}
            onClick={() => setTab("lines")}
          >
            🚌 الخطوط
          </button>
        )}
      </nav>

      {canShowOverviewAndLines && tab === "overview" && (
        <section className="overview-grid">
          <div className="dashboard-card">
            <div className="card-heading"><div><h2>ملخص سريع</h2><p>نظرة عامة على الملفات الحالية</p></div></div>
            <div className="overview-list">
              <div><span>الطلبات المسجلة</span><b>{counts.all}</b></div>
              <div><span>ملفات تنتظر القرار</span><b>{counts.pending}</b></div>
              <div><span>ملفات مقبولة</span><b>{counts.approved}</b></div>
              <div><span>ملفات مرفوضة</span><b>{counts.rejected}</b></div>
            </div>
          </div>

          <div className="dashboard-card">
            <div className="card-heading"><div><h2>وضعية الخطوط</h2><p>استعمل الخطوط لمعرفة الطاقة والانتظار</p></div><button className="small-link" onClick={() => setTab("lines")}>عرض الكل</button></div>
            <div className="mini-lines">
              {lineBoard.map((line) => (
                <button key={line.line} className="mini-line" onClick={() => { setTab("lines"); setOpenLine(line.line); }}>
                  <span>الخط {line.line}</span>
                  <b>{line.occupied}/{line.capacity}</b>
                  <em>{line.waiting.length} انتظار</em>
                </button>
              ))}
            </div>
          </div>

          <div className="dashboard-card wide">
            <div className="card-heading"><div><h2>آخر الطلبات</h2><p>آخر الطلبات المسجلة</p></div><button className="small-link" onClick={() => setTab("families")}>عرض الملفات</button></div>
            <div className="recent-list">
              {families.slice(0, 6).map((family) => (
                <div key={family.id} className="recent-item">
                  <div><b>{family.guardian_name}</b><span>#{family.registration_number} • {familyLabel(family.family_status)} • {family.children_count} أبناء</span></div>
                  <span className={`status-pill ${statusClass(family.status)}`}>{statusLabel(family.status)}</span>
                </div>
              ))}
              {families.length === 0 && <div className="empty">لا توجد طلبات بعد.</div>}
            </div>
          </div>
        </section>
      )}

      {tab === "families" && (
        <section className="dashboard-card">
          <div className="card-heading family-heading">
            <div><h2>الطلبات</h2><p>ابحث وافتح الملف أو غيّر الحالة</p></div>
            <span className="result-count">{filtered.length} ملف</span>
          </div>

          <div className="search-wrap">
            <span>⌕</span>
            <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="الاسم، الهاتف، CIN، رقم التسجيل، المسار..." />
            {search && <button onClick={() => setSearch("")}>×</button>}
          </div>

          <div className="filter-row">
            {([
              ["all", "الكل"],
              ["pending", "في الانتظار"],
              ["approved", "مقبول"],
              ["rejected", "مرفوض"],
            ] as const).map(([key, label]) => (
              <button key={key} className={status === key ? "filter active" : "filter"} onClick={() => setStatus(key)}>{label}</button>
            ))}
          </div>

          <div className="family-list">
            {filtered.map((family) => (
              <article key={family.id} className="family-card">
                <div className="family-main">
                  <div className="family-title-row">
                    <div>
                      <h3>{family.guardian_name}</h3>
                      <p>طلب #{family.registration_number} • {familyLabel(family.family_status)} • {family.children_count} {family.children_count === 1 ? "ابن" : "أبناء"}</p>
                    </div>
                    <span className={`status-pill ${statusClass(family.status)}`}>{statusLabel(family.status)}</span>
                  </div>

                  <div className="family-info-row">
                    <span>📞 {family.guardian_phone}</span>
                    <span>🪪 {family.guardian_cin}</span>
                    {family.guardian_id_type === "آخر" && <span>👥 {family.guardian_relation || "—"}</span>}
                  </div>

                  {family.family_status === "orphan" && family.death_certificate_path && (
                    <div className="document-note">📄 شهادة الوفاة موجودة في الملف للتحقق.</div>
                  )}

                  <div className="children-list">
                    {family.beneficiaries.map((child) => (
                      <div key={child.id} className="child-row">
                        <div>
                          <b>{child.child_order}. {child.full_name}</b>
                          <span>{child.school} • مسار: {child.route_number || "—"} • حافلة: {child.bus_number} • محطة: {child.bus_stop_number}</span>
                        </div>
                        <Link to={`/admin/beneficiary/${child.id}`} className="view-btn">فتح الملف</Link>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="family-actions">
                  <button className="action wait" disabled={busyId === family.id} onClick={() => void updateFamilyStatus(family, "pending")}>في الانتظار</button>
                  <button className="action ok" disabled={busyId === family.id} onClick={() => void updateFamilyStatus(family, "approved")}>قبول</button>
                  <button className="action danger" disabled={busyId === family.id} onClick={() => void updateFamilyStatus(family, "rejected")}>رفض</button>
                  <button className="action dark" disabled={busyId === family.id} onClick={() => void printBeneficiaryPdf(family.beneficiaries)}>PDF</button>
                  <button className="action delete" disabled={busyId === family.id} onClick={() => void deleteFamily(family)}>حذف</button>
                </div>
              </article>
            ))}
            {filtered.length === 0 && <div className="empty">ما لقيناش ملفات مطابقة للبحث.</div>}
          </div>
        </section>
      )}

      {canShowOverviewAndLines && tab === "lines" && (
        <section className="dashboard-card">
          <div className="card-heading"><div><h2>إدارة الخطوط</h2><p>كل خط بوحدو، والمقبولين والانتظار منفصلين</p></div></div>

          <div className="lines-grid">
            {lineBoard.map((board) => {
              const isOpen = openLine === board.line;
              return (
                <article key={board.line} className={`line-card ${isOpen ? "open" : ""}`}>
                  <button className="line-head" onClick={() => setOpenLine(isOpen ? null : board.line)}>
                    <div><strong>الحافلة {board.line}</strong><span>المقاعد: {board.occupied} / {board.capacity}</span></div>
                    <div><b>{board.free} متبقية</b><em>{board.waiting.length} انتظار</em><span>{isOpen ? "⌃" : "⌄"}</span></div>
                  </button>

                  {isOpen && (
                    <div className="line-content">
                      <div className="line-toolbar">
                        <button className="action dark" onClick={() => exportLine(board.line, "accepted")}>تحميل المقبولين</button>
                        <button className="action wait" onClick={() => exportLine(board.line, "waiting")}>تحميل الانتظار</button>
                      </div>

                      <div className="line-columns">
                        <div className="line-list accepted-list">
                          <div className="list-title ok-title"><span>المقبولون</span><b>{board.accepted.length}</b></div>
                          {board.accepted.map(({ child, family }, index) => (
                            <div key={child.id} className="line-person">
                              <div><b>#{index + 1} • {child.full_name}</b><span>{family.guardian_name} • {child.registration_number}</span></div>
                              <button className="link-btn" disabled={busyId === child.id} onClick={() => void updateLineStatus(child.id, "waiting")}>إرجاع للانتظار</button>
                            </div>
                          ))}
                          {board.accepted.length === 0 && <div className="empty small">لا يوجد مقبولون.</div>}
                        </div>

                        <div className="line-list waiting-list">
                          <div className="list-title wait-title"><span>لائحة الانتظار</span><b>{board.waiting.length}</b></div>
                          {board.waiting.map(({ child, family }, index) => (
                            <div key={child.id} className="line-person">
                              <div><b>#{index + 1} • {child.full_name}</b><span>{family.guardian_name} • {child.registration_number}</span></div>
                              <button className="link-btn ok-link" disabled={busyId === child.id || board.free === 0} onClick={() => void updateLineStatus(child.id, "accepted")}>{board.free === 0 ? "الخط ممتلئ" : "قبول يدوي"}</button>
                            </div>
                          ))}
                          {board.waiting.length === 0 && <div className="empty small">لا يوجد انتظار.</div>}
                        </div>
                      </div>
                    </div>
                  )}
                </article>
              );
            })}
          </div>
        </section>
      )}
    </main>
  );
}

function DashboardStyles() {
  return (
    <style>{`
      .admin-shell{min-height:100vh;background:#f4f7f8;padding:28px 0 60px;color:#17202a}
      .admin-topbar,.stats-row,.dashboard-nav,.overview-grid,.dashboard-card,.admin-alert{max-width:1180px;margin-left:auto;margin-right:auto}
      .admin-topbar{background:#fff;border:1px solid #e5eaee;border-radius:18px;padding:22px 24px;display:flex;justify-content:space-between;align-items:center;gap:16px;margin-bottom:18px;box-shadow:0 4px 18px rgba(15,23,42,.04)}
      .admin-brand{color:#0f766e;font-size:13px;font-weight:800}
      .admin-topbar h1{margin:4px 0;font-size:28px}
      .admin-topbar p{margin:0;color:#64748b}
      .admin-refresh{border:0;background:#0f766e;color:#fff;padding:11px 16px;border-radius:10px;font-family:inherit;cursor:pointer;font-weight:800}
      .admin-alert{background:#fff1f2;color:#b91c1c;border:1px solid #fecdd3;padding:12px 14px;border-radius:12px;margin-bottom:18px}
      .stats-row{display:grid;grid-template-columns:repeat(4,1fr);gap:12px;margin-bottom:14px}
      .stat{border:1px solid #e4eaee;background:#fff;border-radius:14px;padding:16px;text-align:right;font-family:inherit;cursor:pointer;display:flex;align-items:center;justify-content:space-between;gap:12px;box-shadow:0 4px 16px rgba(15,23,42,.03)}
      .stat.active{border:2px solid #0f766e}
      .stat-number{font-size:28px;font-weight:900;line-height:1}
      .stat-label{color:#475569;font-weight:700}
      .stat.wait .stat-number{color:#c2410c}.stat.ok .stat-number{color:#15803d}.stat.danger .stat-number{color:#b91c1c}
      .dashboard-nav{background:#fff;border:1px solid #e5eaee;border-radius:12px;padding:5px;display:flex;gap:5px;margin-bottom:18px}
      .dashboard-nav button{flex:1;border:0;background:transparent;padding:12px;border-radius:8px;font-family:inherit;font-weight:800;color:#64748b;cursor:pointer}.dashboard-nav button.selected{background:#0f766e;color:#fff}
      .overview-grid{display:grid;grid-template-columns:1fr 1fr;gap:16px}.dashboard-card{background:#fff;border:1px solid #e5eaee;border-radius:16px;padding:20px;box-shadow:0 4px 18px rgba(15,23,42,.03)}.dashboard-card.wide{grid-column:1/-1}
      .card-heading{display:flex;justify-content:space-between;align-items:center;gap:10px;margin-bottom:16px}.card-heading h2{margin:0;font-size:20px}.card-heading p{margin:4px 0 0;color:#64748b;font-size:13px}.small-link{border:0;background:#ecfdf5;color:#0f766e;border-radius:8px;padding:8px 11px;font-family:inherit;font-weight:800;cursor:pointer}.overview-list{display:grid;gap:10px}.overview-list div{background:#f8fafc;border-radius:10px;padding:12px 14px;display:flex;justify-content:space-between}.overview-list b{font-size:18px}.mini-lines{display:grid;grid-template-columns:repeat(2,1fr);gap:8px}.mini-line{border:1px solid #e4eaee;background:#f8fafc;border-radius:10px;padding:11px;text-align:right;font-family:inherit;cursor:pointer;display:grid;grid-template-columns:1fr auto;gap:3px 10px}.mini-line span:first-child{font-weight:800}.mini-line b{grid-row:span 2}.mini-line em{font-style:normal;color:#c2410c;font-size:12px}.recent-list{display:grid;gap:8px}.recent-item{display:flex;justify-content:space-between;align-items:center;gap:10px;padding:11px 12px;background:#f8fafc;border-radius:10px}.recent-item b{display:block}.recent-item span{display:block;color:#64748b;font-size:12px;margin-top:3px}
      .status-pill{display:inline-flex;padding:7px 10px;border-radius:999px;font-size:12px;font-weight:900}.status-pill.ok{background:#dcfce7;color:#15803d}.status-pill.wait{background:#ffedd5;color:#c2410c}.status-pill.danger{background:#fee2e2;color:#b91c1c}
      .result-count{background:#ecfdf5;color:#0f766e;border-radius:999px;padding:7px 12px;font-weight:900}.search-wrap{display:flex;align-items:center;gap:10px;background:#f8fafc;border:1px solid #dfe6eb;border-radius:11px;padding:0 12px;margin-bottom:12px}.search-wrap span{font-size:24px;color:#0f766e}.search-wrap input{flex:1;border:0;outline:none;background:transparent;padding:14px 0;font-family:inherit;font-size:15px}.search-wrap button{border:0;background:transparent;font-size:22px;color:#64748b;cursor:pointer}.filter-row{display:flex;flex-wrap:wrap;gap:7px;margin-bottom:16px}.filter{border:1px solid #e2e8f0;background:#fff;border-radius:999px;padding:8px 13px;font-family:inherit;font-weight:800;color:#64748b;cursor:pointer}.filter.active{background:#0f766e;color:#fff;border-color:#0f766e}.family-list{display:grid;gap:12px}.family-card{border:1px solid #e3e8ed;border-radius:13px;overflow:hidden;background:#fff}.family-main{padding:15px}.family-title-row{display:flex;justify-content:space-between;gap:12px;align-items:flex-start}.family-title-row h3{margin:0;font-size:18px}.family-title-row p{margin:4px 0 0;color:#64748b;font-size:12px}.family-info-row{display:flex;flex-wrap:wrap;gap:10px;color:#475569;font-size:13px;margin-top:9px}.document-note{background:#fff7ed;color:#9a3412;border-radius:9px;padding:8px 10px;font-size:12px;margin-top:10px}.children-list{display:grid;gap:7px;margin-top:12px}.child-row{background:#f8fafc;border-radius:9px;padding:9px 10px;display:flex;justify-content:space-between;align-items:center;gap:10px}.child-row b{display:block}.child-row span{display:block;color:#64748b;font-size:12px;margin-top:3px}.view-btn{background:#fff;border:1px solid #d6dee5;color:#0f766e;border-radius:8px;padding:7px 10px;text-decoration:none;font-weight:800;font-size:12px;white-space:nowrap}.family-actions{border-top:1px solid #edf1f4;background:#fbfcfd;padding:10px 15px;display:flex;flex-wrap:wrap;gap:7px}.action{border:0;border-radius:8px;padding:8px 11px;font-family:inherit;font-weight:800;cursor:pointer}.action.wait{background:#fff7ed;color:#c2410c}.action.ok{background:#f0fdf4;color:#15803d}.action.danger,.action.delete{background:#fef2f2;color:#b91c1c}.action.dark{background:#0f766e;color:#fff}.action:disabled{opacity:.55;cursor:not-allowed}
      .lines-grid{display:grid;gap:10px}.line-card{border:1px solid #e3e8ed;border-radius:12px;overflow:hidden}.line-head{width:100%;border:0;background:#fff;padding:14px 15px;display:flex;justify-content:space-between;align-items:center;gap:15px;text-align:right;font-family:inherit;cursor:pointer}.line-head>div{display:flex;align-items:center;gap:12px}.line-head strong{font-size:16px}.line-head span{color:#64748b;font-size:12px}.line-head b{color:#15803d}.line-head em{color:#c2410c;font-style:normal;font-size:12px}.line-card.open .line-head{background:#f8fafc}.line-content{border-top:1px solid #e9eef2;padding:13px}.line-toolbar{display:flex;gap:7px;flex-wrap:wrap;margin-bottom:12px}.line-columns{display:grid;grid-template-columns:1fr 1fr;gap:12px}.line-list{border-radius:10px;padding:11px}.accepted-list{background:#f0fdf4}.waiting-list{background:#fff7ed}.list-title{display:flex;justify-content:space-between;align-items:center;font-weight:900;margin-bottom:8px}.ok-title{color:#15803d}.wait-title{color:#c2410c}.line-person{background:#fff;border-radius:8px;padding:9px;margin-top:7px;display:flex;justify-content:space-between;align-items:center;gap:8px}.line-person b{display:block;font-size:12px}.line-person span{display:block;color:#64748b;font-size:11px;margin-top:3px}.link-btn{border:0;background:transparent;color:#0f766e;font-family:inherit;font-weight:800;font-size:11px;cursor:pointer;white-space:nowrap}.ok-link{background:#ecfdf5;border-radius:7px;padding:6px 8px}.loading-card,.empty{text-align:center;background:#fff;border:1px solid #e5eaee;border-radius:15px;padding:45px;color:#64748b;max-width:1180px;margin:40px auto}.empty.small{padding:15px;background:transparent;border:0}
      @media(max-width:900px){.stats-row{grid-template-columns:repeat(2,1fr)}.overview-grid{grid-template-columns:1fr}.dashboard-card.wide{grid-column:auto}.line-columns{grid-template-columns:1fr}.admin-topbar{margin:0 12px 18px}.stats-row,.dashboard-nav,.overview-grid,.dashboard-card,.admin-alert{margin-left:12px;margin-right:12px}.admin-shell{padding-top:12px}}
      @media(max-width:600px){.stats-row{grid-template-columns:1fr 1fr}.dashboard-nav button{font-size:12px}.family-title-row{flex-direction:column}.child-row{align-items:flex-start;flex-direction:column}.family-actions{display:grid;grid-template-columns:1fr 1fr}.admin-topbar{align-items:flex-start;flex-direction:column}.mini-lines{grid-template-columns:1fr}}
    `}</style>
  );
}