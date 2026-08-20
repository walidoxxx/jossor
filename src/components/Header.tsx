import { Link } from "react-router-dom";
import { useEffect, useState } from "react";

type HeaderProps = {
  admin?: boolean;
};

export default function Header({ admin = false }: HeaderProps) {
  const [compact, setCompact] = useState(false);

  useEffect(() => {
    let lastY = window.scrollY;
    let ticking = false;

    const update = () => {
      ticking = false;

      const y = window.scrollY;
      const isMobile = window.matchMedia("(max-width: 700px)").matches;

      if (!isMobile) {
        setCompact(false);
        lastY = y;
        return;
      }

      const delta = y - lastY;

      // Ignore tiny movements to prevent flickering/jumping.
      if (Math.abs(delta) < 8) return;

      // Going down: compact header.
      if (delta > 0 && y > 80) {
        setCompact(true);
      }

      // Restore the full header ONLY when we reach the very top.
      // Scrolling upward in the middle of the page keeps the compact header.
      if (y <= 10) {
        setCompact(false);
      }

      lastY = y;
    };

    const onScroll = () => {
      if (!ticking) {
        window.requestAnimationFrame(update);
        ticking = true;
      }
    };

    const onResize = () => {
      const isMobile = window.matchMedia("(max-width: 700px)").matches;
      if (!isMobile) setCompact(false);
      lastY = window.scrollY;
    };

    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onResize);

    return () => {
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onResize);
    };
  }, []);

  return (
    <header className={`site-header ${compact ? "site-header-compact" : ""}`}>
      <style>{`
        .site-header{
          position:sticky;
          top:0;
          z-index:50;
          background:#fff;
          border-bottom:1px solid #e7ecef;
        }

        .site-header-inner{
          max-width:1180px;
          margin:0 auto;
          min-height:82px;
          padding:10px 20px;
          display:flex;
          align-items:center;
          justify-content:space-between;
          gap:18px;
          direction:rtl;
          box-sizing:border-box;
          transition:min-height .22s ease, padding .22s ease;
        }

        .site-brand{
          display:flex;
          align-items:center;
          gap:12px;
          min-width:0;
          text-decoration:none;
          color:#0f766e;
        }

        .site-brand-logo{
          width:54px;
          height:54px;
          object-fit:contain;
          object-position:center;
          border-radius:10px;
          flex:0 0 auto;
          background:#fff;
          transition:width .22s ease, height .22s ease;
        }

        .site-brand-text{
          min-width:0;
          text-align:right;
          transition:opacity .18s ease, visibility .18s ease, transform .18s ease;
        }

        .site-brand-ar{
          color:#0f766e;
          font-size:16px;
          font-weight:900;
          line-height:1.35;
        }

        .site-brand-fr{
          color:#64748b;
          font-size:10px;
          line-height:1.4;
          margin-top:2px;
          direction:ltr;
          white-space:nowrap;
        }

        .site-actions{
          display:flex;
          align-items:center;
          justify-content:center;
          gap:8px;
          flex-wrap:wrap;
          transition:opacity .18s ease, visibility .18s ease, transform .18s ease;
        }

        .site-action{
          min-height:42px;
          padding:0 15px;
          border-radius:10px;
          border:1px solid #dce5e1;
          background:#f8faf9;
          color:#334155;
          text-decoration:none;
          font-family:inherit;
          font-size:13px;
          font-weight:900;
          display:inline-flex;
          align-items:center;
          justify-content:center;
          white-space:nowrap;
          transition:all .18s ease;
        }

        .site-action:hover{
          transform:translateY(-1px);
          border-color:#b8d6c6;
          background:#f0fdf4;
        }

        .site-action.primary{
          background:#0f766e;
          color:#fff;
          border-color:#0f766e;
        }

        .site-action.primary:hover{
          background:#0b665f;
        }

        @media (max-width:700px){
          .site-header-inner{
            min-height:auto;
            padding:14px 12px 16px;
            flex-direction:column;
            justify-content:center;
            align-items:center;
            gap:12px;
          }

          .site-brand{
            width:100%;
            flex-direction:column;
            align-items:center;
            justify-content:center;
            gap:7px;
            text-align:center;
          }

          .site-brand-logo{
            width:68px;
            height:68px;
            border-radius:12px;
          }

          .site-brand-text{
            width:100%;
            text-align:center;
          }

          .site-brand-ar{
            font-size:18px;
            line-height:1.45;
          }

          .site-brand-fr{
            font-size:10px;
            white-space:normal;
            margin-top:4px;
            max-width:96vw;
          }

          .site-actions{
            width:100%;
            display:grid;
            grid-template-columns:repeat(3,minmax(0,1fr));
            gap:7px;
          }

          .site-action{
            width:100%;
            min-height:44px;
            padding:0 5px;
            font-size:12px;
          }

          /* Compact state: only the logo remains.
             The header keeps a stable box so the page does not jump. */
          .site-header-compact .site-header-inner{
            min-height:64px;
            height:64px;
            padding:8px 12px;
            gap:0;
          }

          .site-header-compact .site-brand{
            width:auto;
          }

          .site-header-compact .site-brand-logo{
            width:48px;
            height:48px;
          }

          .site-header-compact .site-brand-text,
          .site-header-compact .site-actions{
            position:absolute;
            opacity:0;
            visibility:hidden;
            pointer-events:none;
            transform:translateY(-6px);
          }
        }

        @media (max-width:420px){
          .site-header-inner{
            padding-left:10px;
            padding-right:10px;
          }

          .site-brand-logo{
            width:64px;
            height:64px;
          }

          .site-brand-ar{
            font-size:17px;
          }

          .site-action{
            min-height:42px;
            font-size:11px;
          }

          .site-header-compact .site-header-inner{
            height:60px;
            min-height:60px;
          }

          .site-header-compact .site-brand-logo{
            width:46px;
            height:46px;
          }
        }
      `}</style>

      <div className="site-header-inner">
        <Link to="/" className="site-brand" aria-label="الصفحة الرئيسية">
          <img
            src="/logo-jossour-mark.jpg"
            alt="شعار جمعية جسور"
            className="site-brand-logo"
          />

          <div className="site-brand-text">
            <div className="site-brand-ar">
              جمعية جسور لتنمية النقل المدرسي بالتمسية
            </div>

            <div className="site-brand-fr">
              Association Jossour pour le Développement du Transport Scolaire à Temsia
            </div>
          </div>
        </Link>

        <nav className="site-actions" aria-label="التنقل الرئيسي">
          <Link to="/" className="site-action">
            🏠 الرئيسية
          </Link>

          {!admin && (
            <Link to="/status" className="site-action">
              🔎 تتبع ملفي
            </Link>
          )}

          {admin ? (
            <Link to="/inscription" className="site-action primary">
              📝 صفحة التسجيل
            </Link>
          ) : (
            <Link to="/admin/login" className="site-action primary">
              🔐 الإدارة
            </Link>
          )}
        </nav>
      </div>
    </header>
  );
}