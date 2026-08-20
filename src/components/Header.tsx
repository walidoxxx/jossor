import { Link } from "react-router-dom";

type HeaderProps = {
  admin?: boolean;
};

export default function Header({ admin = false }: HeaderProps) {
  return (
    <header
      dir="rtl"
      style={{
        background: "#ffffff",
        borderBottom: "1px solid #e7ecef",
        position: "sticky",
        top: 0,
        zIndex: 20,
        boxShadow: "0 2px 12px rgba(15, 23, 42, 0.04)",
      }}
    >
      <div
        className="container"
        style={{
          minHeight: 82,
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: 18,
        }}
      >
        <Link
          to={admin ? "/admin" : "/inscription"}
          aria-label="جمعية جسور لتنمية النقل المدرسي بالتمسية"
          style={{
            display: "flex",
            alignItems: "center",
            gap: 12,
            textDecoration: "none",
            color: "#17202a",
            minWidth: 0,
          }}
        >
          <img
            src="/logo-jossour-mark.jpg"
            alt="شعار جمعية جسور"
            style={{
              width: 58,
              height: 58,
              objectFit: "contain",
              borderRadius: 12,
              flexShrink: 0,
              background: "#fff",
            }}
          />

          <div style={{ minWidth: 0 }}>
            <div
              style={{
                color: "#0f766e",
                fontWeight: 900,
                fontSize: 16,
                lineHeight: 1.25,
              }}
            >
              جمعية جسور لتنمية النقل المدرسي بالتمسية
            </div>

            <div
              style={{
                marginTop: 4,
                color: "#64748b",
                fontSize: 11,
                lineHeight: 1.3,
              }}
            >
              Association Jossour pour le Développement du Transport Scolaire à Temsia
            </div>
          </div>
        </Link>

        {admin ? (
          <Link
            className="btn btn-secondary"
            to="/inscription"
            style={{
              textDecoration: "none",
              whiteSpace: "nowrap",
              fontWeight: 800,
            }}
          >
            صفحة التسجيل
          </Link>
        ) : (
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 8,
              flexWrap: "wrap",
              justifyContent: "flex-start",
            }}
          >
            <Link
              className="btn btn-ghost"
              to="/status"
              style={{
                textDecoration: "none",
                whiteSpace: "nowrap",
                fontWeight: 800,
              }}
            >
              تتبع ملفي
            </Link>

            <Link
              className="btn btn-ghost"
              to="/admin/login"
              style={{
                textDecoration: "none",
                whiteSpace: "nowrap",
                fontWeight: 800,
              }}
            >
              الإدارة
            </Link>
          </div>
        )}
      </div>

      <style>{`
        @media (max-width: 700px) {
          header .container {
            min-height: 72px !important;
            gap: 10px !important;
          }

          header img {
            width: 48px !important;
            height: 48px !important;
          }

          header .container > a:first-child > div:last-child div:first-child {
            font-size: 14px !important;
          }

          header .container > a:first-child > div:last-child div:last-child {
            display: none !important;
          }

          header .container > div:last-child {
            gap: 6px !important;
          }

          header .container > div:last-child .btn {
            padding: 9px 10px !important;
            font-size: 12px !important;
          }
        }
      `}</style>
    </header>
  );
}