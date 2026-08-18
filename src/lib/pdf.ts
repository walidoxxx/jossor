import html2canvas from "html2canvas";
import { jsPDF } from "jspdf";
import type { Beneficiary } from "../types/beneficiary";
import { supabase, PHOTO_BUCKET } from "./supabase";

const PAGE_W = 794;
const PAGE_H = 1123;
const A4_W = 210;
const A4_H = 297;

function esc(value: string | null | undefined) {
  if (!value) return "";

  return value.replace(/[<>&"]/g, (char) =>
    ({
      "<": "&lt;",
      ">": "&gt;",
      "&": "&amp;",
      '"': "&quot;",
    }[char] || char),
  );
}

function formatDate(value: string | null) {
  if (!value) return "";

  const [y, m, d] = value.split("-");

  return y && m && d
    ? `${d}/${m}/${y}`
    : value;
}

async function getPhotoDataUrl(path: string | null) {
  if (!path) return "";

  const { data, error } =
    await supabase.storage
      .from(PHOTO_BUCKET)
      .createSignedUrl(path, 600);

  if (error || !data?.signedUrl) {
    console.error("PDF PHOTO SIGNED URL ERROR:", error);
    return "";
  }

  try {
    /*
      html2canvas may display the remote image in the browser but fail to
      capture it when the image comes from Supabase Storage. Fetching the
      signed image first and converting it to a data URL makes the image
      local to the generated document and avoids the cross-origin capture
      problem.
    */
    const response = await fetch(data.signedUrl, {
      method: "GET",
      cache: "no-store",
      mode: "cors",
    });

    if (!response.ok) {
      throw new Error(
        `Photo download failed: ${response.status} ${response.statusText}`,
      );
    }

    const blob = await response.blob();

    if (!blob.type.startsWith("image/")) {
      throw new Error(
        `Photo is not an image: ${blob.type || "unknown type"}`,
      );
    }

    return await new Promise<string>((resolve, reject) => {
      const reader = new FileReader();

      reader.onload = () =>
        resolve(
          typeof reader.result === "string"
            ? reader.result
            : "",
        );

      reader.onerror = () =>
        reject(
          new Error(
            "تعذر تحويل صورة المستفيد إلى صيغة مناسبة للـPDF.",
          ),
        );

      reader.readAsDataURL(blob);
    });
  } catch (photoError) {
    console.error("PDF PHOTO LOAD ERROR:", photoError);
    return "";
  }
}

function header(title: string) {
  return `
    <div class="header">
      <div class="header-ar">
        جمعية جسور لتنمية النقل المدرسي بالتمسية
      </div>

      <div class="header-fr">
        Association Jossour pour le Développement du Transport Scolaire à Temsia
      </div>

      <div class="doc-title">
        ${title}
      </div>
    </div>
  `;
}

function page1(
  b: Beneficiary,
  photoUrl: string,
) {
  return `
    <div class="page">

      ${header("سجل المستفيد(ة)")}

      <div class="top-row">

        <div class="photo-box">
          ${
            photoUrl
              ? `<img src="${esc(photoUrl)}" alt="صورة المستفيد" />`
              : "<span>الصورة</span>"
          }
        </div>

        <div class="reg-box">
          <span>رقم الاستفادة</span>
          <strong>
            #${esc(String(b.registration_number))}
          </strong>
        </div>

      </div>

      <section class="section beneficiary-info">

        <div class="section-title">
          معلومات المستفيد(ة)
        </div>

        <div class="row">
          <div class="field">
            <b>الاسم الكامل:</b>
            ${esc(b.full_name)}
          </div>

          <div class="field">
            <b>الجنس:</b>
            ${esc(b.gender)}
          </div>
        </div>

        <div class="row">

          <div class="field">
            <b>المستوى الدراسي:</b>
            ${esc(b.education_level)}
          </div>

          <div class="field">
            <b>رقم مسار:</b>
            ${esc(b.route_number)}
            · القسم:
            ${esc(b.class_number)}
          </div>

        </div>

        <div class="row">

          <div class="field">
            <b>المؤسسة:</b>
            ${esc(b.school)}
          </div>

          <div class="field">
            <b>تاريخ الازدياد:</b>
            ${esc(formatDate(b.birth_date))}
          </div>

        </div>

        <div class="row">

          <div class="field">
            <b>مكان الازدياد:</b>
            ${esc(b.birth_place)}
          </div>

          <div class="field">
            <b>رقم الهاتف:</b>
            ${esc(b.phone)}
          </div>

        </div>

        <div class="field full">
          <b>العنوان:</b>
          ${esc(b.address)}
        </div>

      </section>

      <section class="section guardian-info">

        <div class="section-title">
          معلومات ولي أمر المستفيد(ة)
        </div>

        <div class="row">

          <div class="field">
            <b>الاسم الكامل:</b>
            ${esc(b.guardian_name)}
          </div>

          <div class="field">
            <b>رقم الهاتف:</b>
            ${esc(b.guardian_phone)}
          </div>

        </div>

        <div class="row">

          <div class="field">
            <b>رقم البطاقة الوطنية:</b>
            ${esc(b.guardian_cin)}
          </div>

          <div class="field">
            <b>حامل البطاقة:</b>
            ${esc(b.guardian_id_type)}
          </div>

        </div>

        ${
          b.guardian_id_type === "آخر"
            ? `
              <div class="field full">
                <b>صلة القرابة:</b>
                ${esc(b.guardian_relation)}
              </div>
            `
            : ""
        }

        <div class="field full">
          <b>العنوان:</b>
          ${esc(b.guardian_address)}
        </div>

      </section>

      <section class="section transport-info">

        <div class="section-title">
          معلومات النقل المدرسي
        </div>

        <div class="transport-grid">

          <div class="transport-card">
            <span>رقم الحافلة المستعملة</span>
            <strong>
              ${esc(b.bus_number)}
            </strong>
          </div>

          <div class="transport-card">
            <span>رقم محطة الوقوف</span>
            <strong>
              ${esc(b.bus_stop_number)}
            </strong>
          </div>

        </div>

      </section>

      <section class="notice-box">

        <div class="notice-title">
          ملاحظة إدارية هامة
        </div>

        <div>
          يُعدّ هذا التسجيل طلباً أولياً لا يكتسب صفته النهائية
          إلا بعد إيداع الوثائق المطلوبة لدى إدارة الجمعية داخل
          أجل لا يتجاوز ثلاثة (3) أيام من تاريخ التسجيل.
        </div>

        <div>
          ويُلغى الطلب تلقائياً عند عدم إيداع الوثائق داخل الأجل
          المحدد، كما لا يُعتبر التسجيل مكتملاً ونهائياً إلا بعد
          التحقق من الملف وتسليم وصل الاستفادة من طرف إدارة الجمعية.
        </div>

        <div>
          يتحمل صاحب الطلب مسؤولية صحة المعلومات والوثائق المدلى
          بها، ويُعتبر توقيعه وإيداعه للوثائق إقراراً باطلاعه
          عليها وموافقته على مضمونها.
        </div>

      </section>

    </div>
  `;
}

function page2(b: Beneficiary) {
  return `
    <div class="page">

      ${header("التزام أب أو ولي أمر المستفيد(ة)")}

      <section class="commit-info">

        <div class="line">
          <b>أنا الموقع(ة) أسفله:</b>
        </div>

        <div class="line">
          السيد(ة):
          <strong>
            ${esc(b.guardian_name)}
          </strong>
        </div>

        <div class="line">
          الحامل(ة) لبطاقة التعريف الوطنية رقم:
          <strong>
            ${esc(b.guardian_cin)}
          </strong>
        </div>

        <div class="line">
          ولي(ة) أمر المستفيد(ة):
          <strong>
            ${esc(b.full_name)}
          </strong>
        </div>

        <div class="line">
          رقم الهاتف:
          <strong>
            ${esc(b.guardian_phone)}
          </strong>
        </div>

        <div class="line">
          العنوان:
          <strong>
            ${esc(b.guardian_address)}
          </strong>
        </div>

        ${
          b.guardian_id_type === "آخر"
            ? `
              <div class="line">
                صلة القرابة:
                <strong>
                  ${esc(b.guardian_relation)}
                </strong>
              </div>
            `
            : ""
        }

        <div class="guardian-type">

          ${
            b.guardian_id_type === "أب"
              ? "☑"
              : "☐"
          }
          أب

          &nbsp;&nbsp;&nbsp;

          ${
            b.guardian_id_type === "أم"
              ? "☑"
              : "☐"
          }
          أم

          &nbsp;&nbsp;&nbsp;

          ${
            b.guardian_id_type === "آخر"
              ? "☑"
              : "☐"
          }
          آخر

        </div>

      </section>

      <div class="rules-heading">
        أشهد وألتزم باحترام ابني/ابنتي للضوابط التالية:
      </div>

      <section class="rules">

        <div>
          ❖ باحترام ابني / ابنتي للتوقيت والبرنامج الأسبوعي للنقل.
        </div>

        <div>
          ❖ حضور ابني / ابنتي إلى محطة انطلاق الحافلة قبل الموعد
          المحدد في كل محطة بـ 10 دقائق، واحترام برنامج الرحلات خلال
          عملية العودة من المؤسسات التعليمية.
        </div>

        <div>
          ❖ تحمل المسؤولية الكاملة في حال تأخر ابني / ابنتي عن موعد
          انطلاق الحافلة من المحطة.
        </div>

        <div>
          ❖ صعود ابني / ابنتي إلى الحافلة والنزول منها في المكان
          المخصص.
        </div>

        <div>
          ❖ إدلاء ابني / ابنتي ببطاقة المستفيد(ة) للسائق أو المراقب
          المكلف، وذلك عند الولوج للحافلة أو عندما يطلب منه(ها) ذلك.
        </div>

        <div>
          ❖ احترام ابني / ابنتي للسائقين والمراقبين والزملاء من
          التلميذات والتلاميذ، والحرص على عدم إزعاجهم أو التشاجر معهم.
        </div>

        <div>
          ❖ عدم فتح ابني / ابنتي نوافذ الحافلة أو إخراج جزء من الجسد
          أو الولوج من خلالها.
        </div>

        <div>
          ❖ عدم حمل ابني / ابنتي لأدوات حادة على متن الحافلة.
        </div>

        <div>
          ❖ المحافظة على نظافة الحافلة وتجهيزاتها، واجتناب رمي
          الأزبال داخلها أو الأكل فيها.
        </div>

        <div>
          ❖ تعهدي بأداء مبلغ تعويضي لأي خسارة مادية للحافلة والتي
          يمكن أن يتسبب فيها ابني / ابنتي بعد ثبوت ذلك.
        </div>

        <div>
          ❖ اصطفاف ابني / ابنتي بالقرب من الحافلة، وانتظار الإذن من
          السائق قبل ولوجها، واجتناب الازدحام والتدافع والحفاظ على
          الهدوء والنظام داخلها.
        </div>

        <div>
          ❖ عدم تشغيل ابني / ابنتي للأغاني والاستماع إليها وكل ما
          يخل بالحياء.
        </div>

        <div>
          ❖ عدم تنقل ابني / ابنتي بواسطة الحافلة في المسارات والخطوط
          غير التابعة لمقر الإقامة، والالتزام بالمسار الذي يتم
          التأشير عليه ببطاقة المستفيد(ة).
        </div>

        <div>
          ❖ التزامي بأداء واجب الاستفادة الشهري في الأيام الخمسة
          الأولى من كل شهر، من 01 إلى 05، وإن تخلفت عن ذلك تُسحب مني
          البطاقة مباشرة إلى حين أداء ما بذمتي.
        </div>

        <div>
          ❖ عند تخلفي عن أداء واجب الاستفادة لأي سبب من الأسباب،
          فإنني ألتزم بتقديم طلب لإعادة استفادة ابني / ابنتي من
          خدمة النقل المدرسي.
        </div>

        <div>
          ❖ ألتزم بأداء واجب الاستفادة لشهري أبريل وماي معاً.
        </div>

        <div>
          ❖ تعتبر بطاقة الاستفادة وثيقة شخصية لا يمكن استعمالها إلا
          من طرف المعني بالأمر، وعند إتلافها أو سرقتها أو ضياعها وجب
          إخبار إدارة الجمعية بذلك وأداء مبلغ 20 درهماً للحصول على
          بطاقة جديدة.
        </div>

      </section>

      <div class="signature">

        <div>
          وبه ألتزم وأشهد
        </div>

        <div class="sign-name">
          إمضاء ولي أمر المستفيد(ة)
        </div>

        <div class="sign-space"></div>

      </div>

    </div>
  `;
}

function styles() {
  return `
    @import url('https://fonts.googleapis.com/css2?family=Cairo:wght@400;500;600;700;800&display=swap');

    * {
      box-sizing: border-box;
    }

    body {
      margin: 0;
      font-family: Cairo, Arial, sans-serif;
      background: #fff;
      color: #111;
    }

    .page {
      width: ${PAGE_W}px;
      height: ${PAGE_H}px;
      position: relative;
      overflow: hidden;
      direction: rtl;
      background: #fff;
      padding: 36px 50px;
    }

    .header {
      height: 120px;
      text-align: center;
      position: relative;
    }

    .header-ar {
      font-size: 26px;
      font-weight: 800;
      line-height: 1.25;
    }

    .header-fr {
      font-family: Arial, sans-serif;
      font-size: 16px;
      margin-top: 4px;
      direction: ltr;
    }

    /*
      تم حذف الخط الموجود تحت العنوان
      نهائياً.
    */

    .doc-title {
      position: absolute;
      left: 0;
      right: 0;
      bottom: 0;
      font-size: 34px;
      font-weight: 800;
    }

    .top-row {
      height: 92px;
      position: relative;
      margin-bottom: 8px;
    }

    .photo-box {
      position: absolute;
      left: 0;
      top: 0;
      width: 135px;
      height: 145px;
      border: 3px solid #111;
      display: flex;
      align-items: center;
      justify-content: center;
      overflow: hidden;
      background: #fff;
      font-size: 18px;
      font-weight: 700;
      z-index: 2;
    }

    .photo-box img {
      width: 100%;
      height: 100%;
      object-fit: cover;
    }

    .reg-box {
      position: absolute;
      right: 95px;
      top: 35px;
      display: flex;
      gap: 10px;
      align-items: center;
    }

    .reg-box span,
    .reg-box strong {
      border: 3px solid #111;
      border-radius: 9px;
      padding: 7px 16px;
      font-size: 17px;
    }

    .reg-box strong {
      min-width: 82px;
      text-align: center;
    }

    .section {
      position: absolute;
      left: 50px;
      right: 50px;
      border: 3px solid #111;
      border-radius: 17px;
      padding: 34px 22px 12px;
      background: #fff;
    }

    .section-title {
      position: absolute;
      right: 18px;
      top: -24px;
      background: #fff;
      border: 3px solid #111;
      border-radius: 12px;
      padding: 7px 15px;
      font-size: 18px;
      font-weight: 800;
      white-space: nowrap;
    }

    .beneficiary-info {
      top: 255px;
      height: 330px;
    }

    .guardian-info {
      top: 610px;
      height: 225px;
    }

    .transport-info {
      top: 860px;
      height: 120px;
    }

    .row {
      display: flex;
      gap: 20px;
    }

    .field {
      flex: 1;
      min-width: 0;
      border-bottom: 1px dotted #555;
      padding: 6px 3px;
      font-size: 14px;
      line-height: 1.35;
      overflow: hidden;
      overflow-wrap: anywhere;
    }

    .field.full {
      width: 100%;
    }

    .transport-grid {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 20px;
      margin-top: 6px;
    }

    .transport-card {
      border: 2px solid #222;
      border-radius: 10px;
      min-height: 58px;
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 0 18px;
      font-size: 16px;
    }

    .transport-card strong {
      font-size: 21px;
    }

    .notice-box {
      position: absolute;
      left: 50px;
      right: 50px;
      top: 995px;
      min-height: 92px;
      border: 2px solid #111;
      border-radius: 12px;
      padding: 10px 14px;
      background: #fff;
      font-size: 10.5px;
      line-height: 1.55;
      overflow: hidden;
    }

    .notice-title {
      font-weight: 800;
      font-size: 13px;
      margin-bottom: 4px;
      text-align: center;
    }

    .commit-info {
      position: absolute;
      left: 50px;
      right: 50px;
      top: 175px;
      height: 235px;
      border: 3px solid #111;
      border-radius: 17px;
      padding: 18px 25px;
      background: #fff;
    }

    .line {
      padding: 5px 0;
      border-bottom: 1px dotted #555;
      font-size: 15px;
      line-height: 1.3;
    }

    .guardian-type {
      text-align: right;
      padding-top: 8px;
      font-size: 15px;
    }

    .rules-heading {
      position: absolute;
      top: 435px;
      left: 50px;
      right: 50px;
      font-size: 19px;
      font-weight: 800;
    }

    .rules {
      position: absolute;
      top: 475px;
      left: 50px;
      right: 50px;
      height: 500px;
      border: 3px solid #111;
      border-radius: 17px;
      padding: 18px 25px;
      overflow: hidden;
      font-size: 12.2px;
      line-height: 1.38;
    }

    .rules > div {
      margin-bottom: 5px;
    }

    .signature {
      position: absolute;
      top: 1000px;
      left: 50px;
      right: 50px;
      text-align: center;
      font-size: 17px;
      font-weight: 700;
    }

    .sign-name {
      margin-top: 5px;
    }

    .sign-space {
      height: 28px;
      width: 240px;
      margin: 4px auto 0;
      border-bottom: 1px solid #111;
    }
  `;
}

export async function printBeneficiaryPdf(
  input: Beneficiary | Beneficiary[],
  photoOverrides: Record<string, string> = {},
) {
  const list = Array.isArray(input)
    ? input
    : [input];

  const host = document.createElement("div");

  host.style.cssText = `
    position:fixed;
    left:-10000px;
    top:0;
    width:${PAGE_W}px;
    background:#fff;
    z-index:-1;
  `;

  const style = document.createElement("style");

  style.textContent = styles();

  document.head.appendChild(style);

  const parts: string[] = [];

  for (const b of list) {
    const override = photoOverrides[b.id] || "";
    const photoUrl = override || await getPhotoDataUrl(b.photo_path);

    parts.push(
      page1(b, photoUrl),
      page2(b),
    );
  }

  host.innerHTML = parts.join("");

  document.body.appendChild(host);

  try {
    await document.fonts?.ready;

    const pages =
      Array.from(
        host.querySelectorAll(".page"),
      ) as HTMLElement[];

    const pdf = new jsPDF({
      orientation: "portrait",
      unit: "mm",
      format: "a4",
      compress: true,
    });

    for (
      let i = 0;
      i < pages.length;
      i++
    ) {
      const canvas =
        await html2canvas(
          pages[i],
          {
            scale: 2,
            useCORS: true,
            allowTaint: false,
            imageTimeout: 15000,
            backgroundColor: "#fff",
            logging: false,
            width: PAGE_W,
            height: PAGE_H,
            windowWidth: PAGE_W,
            windowHeight: PAGE_H,
          },
        );

      if (i > 0) {
        pdf.addPage();
      }

      pdf.addImage(
        canvas.toDataURL(
          "image/jpeg",
          0.96,
        ),
        "JPEG",
        0,
        0,
        A4_W,
        A4_H,
        undefined,
        "FAST",
      );
    }

    const fileName =
      list.length === 1
        ? `jossour-${list[0].registration_number}-${list[0].full_name}`
        : `jossour-family-${list[0].family_id}`;

    pdf.save(
      `${fileName.replace(
        /[\\/:*?"<>|]/g,
        "_",
      )}.pdf`,
    );
  } finally {
    host.remove();
    style.remove();
  }
}