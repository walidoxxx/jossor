import { Link } from "react-router-dom";
import type { ReactNode } from "react";

const GREEN = "#087a52";
const GREEN_DARK = "#075f41";
const GREEN_LIGHT = "#edf9f1";
const BORDER = "#d9e7df";
const TEXT = "#0f241b";
const MUTED = "#64776e";

function ServiceCard({
  icon,
  title,
  description,
  to,
  button,
}: {
  icon: ReactNode;
  title: string;
  description: string;
  to: string;
  button: string;
}) {
  return (
    <article className="home-service-card">
      <div className="home-service-icon">{icon}</div>
      <h3>{title}</h3>
      <p>{description}</p>
      <Link to={to} className="home-service-button">
        {button}
      </Link>
    </article>
  );
}

export default function Home() {
  return (
    <main className="home-page" dir="rtl">
      <style>{`
        .home-page{
          min-height:100vh;
          background:#f8fcf9;
          color:${TEXT};
          font-family:inherit;
        }

        .home-topbar{
          background:#fff;
          border-bottom:1px solid ${BORDER};
          position:sticky;
          top:0;
          z-index:30;
        }

        .home-topbar-inner{
          max-width:1240px;
          margin:0 auto;
          min-height:76px;
          padding:0 22px;
          display:flex;
          align-items:center;
          justify-content:space-between;
          gap:20px;
        }

        .home-brand{
          display:flex;
          align-items:center;
          gap:14px;
          text-decoration:none;
          color:${TEXT};
          min-width:0;
        }

        .home-brand-logo{
          width:58px;
          height:58px;
          object-fit:contain;
          object-position:center;
          border-radius:12px;
          background:#fff;
          flex:0 0 auto;
        }

        .home-brand-text{
          min-width:0;
          text-align:right;
        }

        .home-brand-ar{
          color:${GREEN};
          font-size:16px;
          font-weight:900;
          line-height:1.35;
        }

        .home-brand-fr{
          color:${MUTED};
          font-size:11px;
          margin-top:2px;
          white-space:nowrap;
        }

        .home-top-actions{
          display:flex;
          align-items:center;
          gap:9px;
          flex-wrap:wrap;
          justify-content:flex-start;
        }

        .home-top-button{
          display:inline-flex;
          align-items:center;
          justify-content:center;
          min-height:42px;
          padding:0 16px;
          border-radius:10px;
          text-decoration:none;
          font-weight:900;
          font-family:inherit;
          border:1px solid ${BORDER};
          color:${GREEN_DARK};
          background:#fff;
          transition:.18s ease;
        }

        .home-top-button:hover{
          transform:translateY(-1px);
          border-color:#b9d8c8;
        }

        .home-top-button.primary{
          color:#fff;
          background:${GREEN};
          border-color:${GREEN};
        }

        .home-hero{
          background:
            radial-gradient(circle at 8% 70%, rgba(8,122,82,.08), transparent 22%),
            radial-gradient(circle at 92% 24%, rgba(8,122,82,.06), transparent 24%),
            linear-gradient(180deg,#f1fbf4 0%,#edf8f0 100%);
          border-bottom:1px solid ${BORDER};
        }

        .home-hero-inner{
          max-width:1240px;
          margin:0 auto;
          min-height:430px;
          padding:58px 22px 44px;
          display:grid;
          grid-template-columns:0.9fr 1.1fr;
          align-items:center;
          gap:56px;
        }

        .home-hero-logo-wrap{
          display:flex;
          align-items:center;
          justify-content:center;
          min-height:320px;
        }

        .home-hero-logo{
          width:min(360px,72vw);
          max-height:315px;
          object-fit:contain;
          object-position:center;
          mix-blend-mode:multiply;
          filter:drop-shadow(0 18px 28px rgba(16,52,36,.08));
        }

        .home-hero-content{
          text-align:right;
        }

        .home-badge{
          display:inline-flex;
          align-items:center;
          gap:7px;
          padding:8px 13px;
          border-radius:999px;
          background:#fff;
          border:1px solid ${BORDER};
          color:${GREEN_DARK};
          font-size:13px;
          font-weight:900;
        }

        .home-hero h1{
          margin:18px 0 14px;
          font-size:clamp(30px,4.3vw,54px);
          line-height:1.18;
          color:${GREEN_DARK};
          font-weight:900;
          letter-spacing:-.5px;
        }

        .home-hero p{
          margin:0;
          max-width:760px;
          color:#4f625a;
          font-size:clamp(15px,1.8vw,19px);
          line-height:1.95;
        }

        .home-divider{
          display:flex;
          align-items:center;
          gap:12px;
          margin-top:26px;
          color:${GREEN};
        }

        .home-divider-line{
          height:1px;
          background:#cfe4d8;
          flex:1;
        }

        .home-services{
          max-width:1240px;
          margin:0 auto;
          padding:42px 22px 22px;
        }

        .home-section-title{
          text-align:center;
          margin-bottom:24px;
        }

        .home-section-title h2{
          margin:0;
          color:${GREEN_DARK};
          font-size:28px;
          font-weight:900;
        }

        .home-section-title p{
          margin:7px 0 0;
          color:${MUTED};
          font-size:14px;
        }

        .home-services-grid{
          display:grid;
          grid-template-columns:repeat(3,1fr);
          gap:18px;
        }

        .home-service-card{
          background:#fff;
          border:1px solid ${BORDER};
          border-radius:20px;
          padding:28px 22px 24px;
          text-align:center;
          box-shadow:0 10px 30px rgba(14,54,36,.05);
          display:flex;
          flex-direction:column;
          min-height:260px;
        }

        .home-service-icon{
          width:66px;
          height:66px;
          margin:0 auto 14px;
          border-radius:50%;
          background:#e2f5e8;
          color:#087a52;
          display:flex;
          align-items:center;
          justify-content:center;
        }

        .home-service-icon svg{
          display:block;
        }

        .home-service-card h3{
          margin:0;
          color:${TEXT};
          font-size:21px;
          font-weight:900;
        }

        .home-service-card p{
          margin:10px auto 20px;
          color:${MUTED};
          line-height:1.8;
          font-size:13px;
          max-width:300px;
          flex:1;
        }

        .home-service-button{
          align-self:center;
          min-width:150px;
          min-height:44px;
          display:inline-flex;
          align-items:center;
          justify-content:center;
          padding:0 18px;
          border-radius:10px;
          background:${GREEN};
          color:#fff;
          text-decoration:none;
          font-weight:900;
          transition:.18s ease;
        }

        .home-service-button:hover{
          background:${GREEN_DARK};
          transform:translateY(-1px);
        }

        .home-trust{
          max-width:1240px;
          margin:0 auto;
          padding:4px 22px 34px;
        }

        .home-trust-box{
          background:#f2fbf5;
          border:1px solid #cfe6d7;
          border-radius:18px;
          display:grid;
          grid-template-columns:repeat(4,1fr);
          overflow:hidden;
        }

        .home-trust-item{
          padding:18px 16px;
          display:flex;
          align-items:center;
          gap:12px;
          justify-content:center;
          text-align:right;
        }

        .home-trust-item + .home-trust-item{
          border-right:1px solid #d8e9df;
        }

        .home-trust-icon{
          width:42px;
          height:42px;
          border-radius:12px;
          background:#e0f2e6;
          display:flex;
          align-items:center;
          justify-content:center;
          flex:0 0 auto;
          font-size:21px;
        }

        .home-trust-title{
          color:${GREEN_DARK};
          font-weight:900;
          font-size:13px;
        }

        .home-trust-text{
          color:${MUTED};
          font-size:11px;
          margin-top:3px;
          line-height:1.6;
        }

        .home-footer{
          margin-top:10px;
          background:${GREEN_DARK};
          color:#fff;
          text-align:center;
          padding:18px 22px;
          font-size:12px;
        }

        @media (max-width:900px){
          .home-topbar-inner{
            align-items:flex-start;
            padding-top:12px;
            padding-bottom:12px;
          }

          .home-hero-inner{
            grid-template-columns:1fr;
            gap:25px;
            padding-top:34px;
          }

          .home-hero-content{
            text-align:center;
            order:1;
          }

          .home-hero-logo-wrap{
            order:2;
            min-height:auto;
          }

          .home-divider{
            max-width:520px;
            margin-left:auto;
            margin-right:auto;
          }

          .home-services-grid{
            grid-template-columns:1fr;
          }

          .home-trust-box{
            grid-template-columns:1fr 1fr;
          }

          .home-trust-item + .home-trust-item{
            border-right:0;
          }

          .home-trust-item:nth-child(even){
            border-right:1px solid #d8e9df;
          }
        }

        @media (max-width:620px){
          .home-topbar-inner{
            flex-direction:column;
            align-items:stretch;
          }

          .home-brand{
            justify-content:flex-start;
          }

          .home-top-actions{
            width:100%;
          }

          .home-top-button{
            flex:1;
          }

          .home-brand-fr{
            white-space:normal;
          }

          .home-hero{
            overflow:hidden;
          }

          .home-hero-inner{
            padding-left:16px;
            padding-right:16px;
          }

          .home-services,
          .home-trust{
            padding-left:16px;
            padding-right:16px;
          }

          .home-trust-box{
            grid-template-columns:1fr;
          }

          .home-trust-item:nth-child(even){
            border-right:0;
            border-top:1px solid #d8e9df;
          }
        }
      `}</style>

      <header className="home-topbar">
        <div className="home-topbar-inner">
          <Link to="/inscription" className="home-brand">
            <img
              src="/logo-jossour-mark.jpg"
              alt="شعار جمعية جسور"
              className="home-brand-logo"
            />
            <div className="home-brand-text">
              <div className="home-brand-ar">
                جمعية جسور لتنمية النقل المدرسي بالتمسية
              </div>
              <div className="home-brand-fr">
                Association Jossour pour le Développement du Transport Scolaire à Temsia
              </div>
            </div>
          </Link>

          <div className="home-top-actions">
            <Link to="/" className="home-top-button">
              🏠 الرئيسية
            </Link>

            <Link to="/status" className="home-top-button">
              🔎 تتبع ملفي
            </Link>

            <Link to="/admin/login" className="home-top-button">
              🔐 فضاء الإدارة
            </Link>
          </div>
        </div>
      </header>

      <section className="home-hero">
        <div className="home-hero-inner">
          <div className="home-hero-content">
            <div className="home-badge">★ الموسم الدراسي الجديد</div>

            <h1>
              جمعية جسور لتنمية
              <br />
              النقل المدرسي بالتمسية
            </h1>

            <p>
              منصة رقمية لتسجيل وتدبير وتتبع ملفات المستفيدين من خدمة النقل المدرسي،
              وتسهيل معالجة الطلبات وطباعة الوثائق الرسمية للجمعية.
            </p>

            <div className="home-divider">
              <span className="home-divider-line" />
              <span style={{ fontSize: 19 }}>🚌</span>
              <span className="home-divider-line" />
            </div>
          </div>

          <div className="home-hero-logo-wrap">
            <img
              src="/logo-jossour-mark.jpg"
              alt="شعار جسور"
              className="home-hero-logo"
            />
          </div>
        </div>
      </section>

      <section className="home-services">
        <div className="home-section-title">
          <h2>خدمات المنصة</h2>
          <p>كل ما تحتاجه للاستفادة من خدمة النقل المدرسي في مكان واحد</p>
        </div>

        <div className="home-services-grid">
          <ServiceCard
            icon={
              <svg
                width="30"
                height="30"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                aria-hidden="true"
              >
                <circle cx="9" cy="8" r="4" />
                <path d="M3 21c0-3.3 2.7-6 6-6s6 2.7 6 6" />
                <path d="M19 8v6" />
                <path d="M16 11h6" />
              </svg>
            }
            title="تسجيل مستفيد جديد"
            description="تسجيل طلب جديد للاستفادة من خدمة النقل المدرسي وإيداع المعلومات الأساسية."
            to="/inscription"
            button="📝 تسجيل الآن"
          />

          <ServiceCard
            icon={
              <svg
                width="30"
                height="30"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                aria-hidden="true"
              >
                <circle cx="11" cy="11" r="7" />
                <path d="m20 20-4-4" />
                <path d="M11 8v6" />
                <path d="M8 11h6" />
              </svg>
            }
            title="تتبع الطلب"
            description="أدخل رقم الملف لتتبع حالة طلبك ومعرفة المرحلة التي وصل إليها."
            to="/status"
            button="🔎 تتبع طلبك"
          />

          <ServiceCard
            icon={
              <svg
                width="30"
                height="30"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                aria-hidden="true"
              >
                <rect x="4" y="4" width="16" height="16" rx="3" />
                <path d="M8 8h8" />
                <path d="M8 12h6" />
                <path d="M8 16h4" />
              </svg>
            }
            title="فضاء الإدارة"
            description="ولوج فضاء الإدارة لتدبير الطلبات، المستفيدين، الخطوط، التقارير والوثائق."
            to="/admin/login"
            button="🔐 الدخول إلى الإدارة"
          />
        </div>
      </section>

      <section className="home-trust">
        <div className="home-trust-box">
          <div className="home-trust-item">
            <div className="home-trust-icon">🛡️</div>
            <div>
              <div className="home-trust-title">أمان وخصوصية</div>
              <div className="home-trust-text">حماية معلوماتكم الشخصية وفق أعلى معايير الأمان.</div>
            </div>
          </div>

          <div className="home-trust-item">
            <div className="home-trust-icon">⏱️</div>
            <div>
              <div className="home-trust-title">تتبع في الوقت الحقيقي</div>
              <div className="home-trust-text">تتبع حالة طلبك لحظة بلحظة من البداية إلى النهاية.</div>
            </div>
          </div>

          <div className="home-trust-item">
            <div className="home-trust-icon">📄</div>
            <div>
              <div className="home-trust-title">وثائق رسمية</div>
              <div className="home-trust-text">طباعة الوثائق الرسمية المعتمدة من الجمعية.</div>
            </div>
          </div>

          <div className="home-trust-item">
            <div className="home-trust-icon">🚌</div>
            <div>
              <div className="home-trust-title">خدمة موثوقة</div>
              <div className="home-trust-text">خدمة نقل مدرسي بمعايير الجودة والسلامة.</div>
            </div>
          </div>
        </div>
      </section>

      <footer className="home-footer">
        © {new Date().getFullYear()} جمعية جسور لتنمية النقل المدرسي بالتمسية — جميع الحقوق محفوظة
      </footer>
    </main>
  );
}