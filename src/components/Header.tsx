import { Link } from "react-router-dom";

type HeaderProps = {
  admin?: boolean;
};

export default function Header({ admin = false }: HeaderProps) {
  return (
    <header
      dir="rtl"
      style={{
        background: "#fff",
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
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          minHeight: 78,
          gap: 18,
        }}
      >
        {/* الهوية ديال الجمعية */}
        <Link
          to={admin ? "/admin" : "/inscription"}
          style={{
            textDecoration: "none",
            color: "#0f766e",
            display: "flex",
            alignItems: "center",
            gap: 14,
            minWidth: 0,
          }}
        >
          {/* اللوغو */}
          <div
            style={{
              width: 78,
              height: 58,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              flexShrink: 0,
              padding: 3,
            }}
          >
            <img
              src="/logo-jossour-mark.jpg"
              alt="شعار جمعية جسور"
              style={{
                width: "100%",
                height: "100%",
                objectFit: "contain",
                objectPosition: "center",
                display: "block",
              }}
            />
          </div>

          {/* الكتابة تبقى كما هي */}
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              justifyContent: "center",
              minWidth: 0,
            }}
          >
            <div
              style={{
                fontWeight: 900,
                fontSize: 16,
                lineHeight: 1.25,
                color: "#0f766e",
              }}
            >
              جمعية جسور لتنمية النقل المدرسي بالتمسية
            </div>

            <span
              style={{
                fontSize: 11,
                color: "#64748b",
                lineHeight: 1.4,
                marginTop: 4,
                whiteSpace: "nowrap",
              }}
            >
              Association Jossour pour le Développement du Transport Scolaire à Temsia
            </span>
          </div>
        </Link>

        {/* زر الإدارة */}
        {admin ? (
          <Link
            className="btn btn-secondary"
            to="/inscription"
            style={{
              textDecoration: "none",
              fontWeight: 800,
              whiteSpace: "nowrap",
            }}
          >
            صفحة التسجيل
          </Link>
        ) : (
          <Link
            className="btn btn-ghost"
            to="/admin/login"
            style={{
              textDecoration: "none",
              fontWeight: 800,
              whiteSpace: "nowrap",
            }}
          >
            الإدارة
          </Link>
        )}
      </div>

      <style>{`
        @media (max-width: 700px) {
          header .container {
            min-height: 70px !important;
            gap: 10px !important;
          }

          header .container > a:first-child {
            gap: 10px !important;
          }

          header .container > a:first-child > div:first-child {
            width: 66px !important;
            height: 52px !important;
          }

          header .container > a:first-child > div:last-child > div:first-child {
            font-size: 13px !important;
          }

          header .container > a:first-child > div:last-child > span {
            font-size: 9px !important;
          }
        }
      `}</style>
    </header>
  );
}