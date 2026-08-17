import { Link } from "react-router-dom";
export default function Header({admin=false}:{admin?:boolean}) {
  return <header style={{background:"#fff",borderBottom:"1px solid #e7ecef",position:"sticky",top:0,zIndex:10}}>
    <div className="container" style={{display:"flex",alignItems:"center",justifyContent:"space-between",minHeight:72,gap:12}}>
      <Link to={admin?"/admin":"/inscription"} style={{textDecoration:"none",color:"#0f766e",fontWeight:800}}>
        جمعية جسور<br/><span style={{fontSize:12,color:"#64748b"}}>النقل المدرسي بالتَّمسية</span>
      </Link>
      {admin ? <Link className="btn btn-secondary" to="/inscription">صفحة التسجيل</Link> : <Link className="btn btn-ghost" to="/admin/login">الإدارة</Link>}
    </div>
  </header>;
}