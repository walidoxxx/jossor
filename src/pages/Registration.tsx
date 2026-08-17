import Header from "../components/Header";
import RegistrationForm from "../components/RegistrationForm";

export default function Registration(){
 return <>
  <Header/>
  <main className="container" style={{padding:"34px 0 60px"}}>
    <div style={{textAlign:"center",marginBottom:24}}>
      <h1 style={{margin:"0 0 8px"}}>تسجيل مستفيد(ة) في النقل المدرسي</h1>
      <p className="muted">المرجو إدخال المعلومات بدقة. بعد الإرسال ستحصلون على رقم الاستفادة.</p>
    </div>
    <RegistrationForm/>
  </main>
 </>;
}