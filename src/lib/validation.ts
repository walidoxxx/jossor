export function validateMoroccanPhone(phone: string) {
  return /^(?:\+212|0)([5-7]\d{8})$/.test(phone.replace(/\s/g, ""));
}
export function validateCIN(cin: string) {
  return /^[A-Za-z]{1,3}\d{5,7}$/i.test(cin.replace(/\s/g, ""));
}
export function validateImage(file: File) {
  const allowed = ["image/jpeg", "image/png", "image/webp"];
  if (!allowed.includes(file.type)) return "الصورة يجب أن تكون JPG أو PNG أو WEBP.";
  if (file.size > 5 * 1024 * 1024) return "حجم الصورة يجب ألا يتجاوز 5MB.";
  return null;
}
