// Password policy: min 8 chars, at least one letter and one digit.
export type PwResult = { ok: boolean; message?: string };

export const validatePassword = (pw: string, lang: "ar" | "en" = "en"): PwResult => {
  const ar = lang === "ar";
  if (!pw || pw.length < 8) {
    return { ok: false, message: ar ? "كلمة المرور يجب أن تكون 8 أحرف على الأقل" : "Password must be at least 8 characters" };
  }
  if (!/[A-Za-z]/.test(pw)) {
    return { ok: false, message: ar ? "يجب أن تحتوي على حرف واحد على الأقل" : "Must contain at least one letter" };
  }
  if (!/\d/.test(pw)) {
    return { ok: false, message: ar ? "يجب أن تحتوي على رقم واحد على الأقل" : "Must contain at least one digit" };
  }
  return { ok: true };
};

export const passwordHint = (lang: "ar" | "en" = "en") =>
  lang === "ar" ? "٨ أحرف على الأقل، وتشمل حرفًا ورقمًا" : "At least 8 characters, including a letter and a digit";
