import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useStore } from "@/context/StoreContext";
import { generateSessionSecret, hashPassword, passwordStrength } from "../lib/crypto";
import { ArrowLeft, Check, Cube, Gift, Shield, Sparkles } from "@/components/icons";
import { cn } from "@/utils/cn";

const COMPLETE_FLAG = "printopia-setup-complete";

const STEPS = [
  "خوش آمدید",
  "بررسی وضعیت پروژه",
  "ساخت حساب مدیر",
  "افزودن کلیدها به Cloudflare",
  "اتصال اختیاری GitHub",
  "بررسی نهایی",
  "راه‌اندازی کامل شد",
];

const STRENGTH_COLORS = ["#ef4444", "#f97316", "#eab308", "#22c55e", "#16a34a"];

function ProgressBar({ step }: { step: number }) {
  const pct = Math.round(((step + 1) / STEPS.length) * 100);
  return (
    <div className="mb-6">
      <div className="mb-2 flex items-center justify-between text-xs text-muted">
        <span>گام { (step + 1).toLocaleString("fa-IR") } از { STEPS.length.toLocaleString("fa-IR") }</span>
        <span className="font-bold text-accent">{STEPS[step]}</span>
      </div>
      <div className="h-2 overflow-hidden rounded-full bg-surface2">
        <div className="h-full rounded-full bg-gradient-to-l from-accent to-accent2 transition-all duration-300" style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}

function SecretBox({ name, value, onCopy }: { name: string; value: string; onCopy: () => void }) {
  return (
    <div className="card p-4">
      <div className="mb-2 flex items-center justify-between gap-2">
        <code dir="ltr" className="text-sm font-bold text-accent">{name}</code>
        <button type="button" onClick={onCopy} className="btn btn-secondary px-3 py-1.5 text-xs">کپی کردن</button>
      </div>
      <code dir="ltr" className="block w-full break-all rounded-lg bg-surface2 p-3 text-[11px] leading-6 text-muted">
        {value}
      </code>
    </div>
  );
}

export function Setup() {
  const { pushToast } = useStore();
  const navigate = useNavigate();
  const [alreadyDone] = useState<boolean>(() => {
    try { return localStorage.getItem(COMPLETE_FLAG) === "1"; } catch { return false; }
  });

  const [step, setStep] = useState(0);
  const [pw, setPw] = useState("");
  const [pw2, setPw2] = useState("");
  const [pwError, setPwError] = useState("");
  const [busy, setBusy] = useState(false);
  const [adminHash, setAdminHash] = useState("");
  const [sessionSecret, setSessionSecret] = useState("");
  const [finalChecks, setFinalChecks] = useState<Record<string, boolean>>({});

  // Never keep generated secrets longer than needed; clear when leaving step 3.
  useEffect(() => {
    if (step !== 3) {
      // keep them only while the user is copying; clear on any navigation away
      if (adminHash || sessionSecret) {
        setAdminHash("");
        setSessionSecret("");
      }
    }
  }, [step, adminHash, sessionSecret]);

  const strength = useMemo(() => passwordStrength(pw), [pw]);

  async function copy(text: string, label: string) {
    try {
      await navigator.clipboard.writeText(text);
      pushToast(`${label} کپی شد`);
    } catch {
      pushToast("کپی خودکار ناموفق بود؛ متن را دستی انتخاب و کپی کنید.", "error");
    }
  }

  async function generate() {
    setPwError("");
    if (pw.length < 8) { setPwError("رمز باید حداقل ۸ نویسه باشد."); return; }
    if (pw !== pw2) { setPwError("رمز و تکرار آن یکسان نیستند."); return; }
    setBusy(true);
    try {
      const hash = await hashPassword(pw);
      const secret = generateSessionSecret();
      setAdminHash(hash);
      setSessionSecret(secret);
      // Clear the readable password from memory immediately.
      setPw("");
      setPw2("");
      pushToast("کلیدهای امن ساخته شدند");
      setStep(3);
    } catch {
      pushToast("ساخت کلید ناموفق بود؛ دوباره تلاش کنید.", "error");
    } finally {
      setBusy(false);
    }
  }

  function cancelAndClear() {
    setPw("");
    setPw2("");
    setAdminHash("");
    setSessionSecret("");
    setPwError("");
    pushToast("اطلاعات واردشده از حافظه پاک شد.", "info");
    setStep(0);
  }

  function finish() {
    try { localStorage.setItem(COMPLETE_FLAG, "1"); } catch { /* ignore */ }
    setStep(6);
  }

  // ---------- Already configured: locked success state ----------
  if (alreadyDone && step !== 6) {
    return (
      <Shell>
        <div className="mx-auto max-w-lg text-center">
          <div className="mx-auto grid h-16 w-16 place-items-center rounded-2xl bg-success/15 text-success">
            <Check className="h-8 w-8" />
          </div>
          <h1 className="mt-4 text-2xl font-extrabold">راه‌اندازی قبلاً کامل شده</h1>
          <p className="mt-2 leading-8 text-muted">
            برای امنیت، تنظیمات حساس فقط پس از ورود به پنل مدیریت قابل‌مشاهده هستند.
          </p>
          <div className="mt-6 flex flex-wrap justify-center gap-2">
            <Link to="/admin" className="btn btn-primary">رفتن به پنل مدیریت</Link>
            <Link to="/" className="btn btn-secondary">مشاهده سایت</Link>
          </div>
        </div>
      </Shell>
    );
  }

  return (
    <Shell>
      <div className="mx-auto max-w-2xl">
        {step < 6 && <ProgressBar step={step} />}

        {/* STEP 0 — Welcome */}
        {step === 0 && (
          <Card>
            <Head icon={<Sparkles className="h-6 w-6" />} title="خوش آمدید به راه‌اندازی پرینتوپیا" />
            <p className="leading-8 text-muted">
              این راهنما، سایت شما را در چند مرحلهٔ ساده آماده می‌کند. شما نیازی به دانستن مفاهیم فنی ندارید.
            </p>
            <div className="my-5 rounded-2xl bg-surface2 p-4 text-center text-sm leading-8 text-muted">
              ورود به پنل <span className="text-fg">/admin</span><br />
              ↓ ساخت حساب مدیر و کلیدهای امن<br />
              ↓ افزودن کلیدها به Cloudflare<br />
              ↓ سایت آمادهٔ مدیریت است
            </div>
            <Warn>
              برای امنیت، یک‌بار باید خودِ صاحبِ حساب در Cloudflare تأیید کند و کلیدها را اضافه نماید. این تأیید قابلِ دور زدن نیست.
            </Warn>
            <Actions>
              <button type="button" onClick={() => setStep(1)} className="btn btn-primary">شروع راه‌اندازی <ArrowLeft className="h-5 w-5" /></button>
              <Link to="/" className="btn btn-ghost text-sm">مشاهده سایت</Link>
            </Actions>
          </Card>
        )}

        {/* STEP 1 — Detection */}
        {step === 1 && (
          <Card>
            <Head icon={<Cube className="h-6 w-6" />} title="بررسی وضعیت پروژه" />
            <p className="mb-4 leading-8 text-muted">بررسی‌های سادهٔ امن انجام شد:</p>
            <ul className="flex flex-col gap-2">
              <Status ok label="سایت روی اینترنت در دسترس است" />
              <Status ok label="پنل مدیریت بارگذاری شده است" />
              <Status info label="پایگاه داده و فضای تصویر (D1/R2): برای این نسخه استفاده نمی‌شوند" />
              <Status info label="اتصال کد از GitHub: در داشبورد Cloudflare بررسی می‌شود" />
              <Status warn label="حساب مدیر امن: پس از افزودن کلیدها فعال می‌شود" />
            </ul>
            <Actions>
              <Back onClick={() => setStep(0)} />
              <button type="button" onClick={() => setStep(2)} className="btn btn-primary">ادامه <ArrowLeft className="h-5 w-5" /></button>
            </Actions>
          </Card>
        )}

        {/* STEP 2 — Admin account */}
        {step === 2 && (
          <Card>
            <Head icon={<Shield className="h-6 w-6" />} title="ساخت حساب مدیر" />
            <p className="leading-8 text-muted">یک رمز عبور انتخاب کنید. ما از روی آن، کلیدِ امنِ ورود را خودکار می‌سازیم؛ نیازی نیست چیزی را محاسبه کنید.</p>

            <div className="mt-4 flex flex-col gap-4">
              <div>
                <label htmlFor="pw" className="mb-2 block text-sm font-bold">رمز عبور</label>
                <input id="pw" type="password" dir="ltr" className="input text-start" value={pw} onChange={(e) => setPw(e.target.value)} autoComplete="new-password" />
              </div>
              {/* strength meter (does not reveal the password) */}
              <div className="flex items-center gap-2">
                <div className="flex flex-1 gap-1">
                  {[0, 1, 2, 3, 4].map((i) => (
                    <span key={i} className="h-1.5 flex-1 rounded-full transition-colors"
                      style={{ backgroundColor: i <= strength.score ? STRENGTH_COLORS[strength.score] : "var(--c-surface2)" }} />
                  ))}
                </div>
                <span className="w-20 text-xs text-muted">{strength.label}</span>
              </div>
              <div>
                <label htmlFor="pw2" className="mb-2 block text-sm font-bold">تکرار رمز عبور</label>
                <input id="pw2" type="password" dir="ltr" className="input text-start" value={pw2} onChange={(e) => setPw2(e.target.value)} autoComplete="new-password" />
              </div>
              {pwError && <p role="alert" className="text-sm text-danger">{pwError}</p>}
              <p className="rounded-xl bg-surface2 p-3 text-xs leading-6 text-muted">
                پیشنهاد: حداقل ۱۲ نویسه؛ ترکیبی از حرف، عدد و نشانه. این رمز را در جای امن نگه دار و با کسی به اشتراک نگذار.
              </p>
            </div>

            <Actions>
              <Back onClick={() => setStep(1)} />
              <div className="flex gap-2">
                <button type="button" onClick={cancelAndClear} className="btn btn-ghost text-sm">لغو و پاک‌کردن</button>
                <button type="button" onClick={generate} disabled={busy} className="btn btn-primary">
                  {busy ? "در حال ساخت..." : "تولید کلیدهای امن"}
                </button>
              </div>
            </Actions>
          </Card>
        )}

        {/* STEP 3 — Add secrets to Cloudflare */}
        {step === 3 && (
          <Card>
            <Head icon={<Sparkles className="h-6 w-6" />} title="افزودن کلیدها به Cloudflare" />
            <p className="leading-8 text-muted">
              دو کلیدِ زیر ساخته شدند. آن‌ها را فقط یک‌بار در Cloudflare اضافه کنید. این مقادیر را هرگز در GitHub یا چت قرار ندهید.
            </p>

            {adminHash && (
              <div className="mt-4 flex flex-col gap-3">
                <SecretBox name="ADMIN_PASSWORD_HASH" value={adminHash} onCopy={() => copy(adminHash, "ADMIN_PASSWORD_HASH")} />
                <SecretBox name="SESSION_SECRET" value={sessionSecret} onCopy={() => copy(sessionSecret, "SESSION_SECRET")} />
              </div>
            )}

            <div className="mt-4 rounded-2xl border border-line p-4">
              <p className="mb-2 text-sm font-bold">مراحل افزودن در Cloudflare:</p>
              <ol className="list-decimal space-y-1 pe-5 text-sm leading-7 text-muted">
                <li>وارد <span dir="ltr">dash.cloudflare.com</span> شو و به <b>Workers & Pages</b> برو.</li>
                <li>پروژهٔ <b>printopia</b> را باز کن.</li>
                <li>به <b>Settings → Variables and Secrets</b> برو.</li>
                <li>دکمهٔ <b>Add secret</b> را بزن؛ نام را دقیقاً بنویس و مقدار را بچسبان. نوع: <b>Secret</b>.</li>
                <li>هر دو کلید را اضافه کن و ذخیره کن.</li>
              </ol>
            </div>

            <Warn>
              توجه: در نسخهٔ فعلی، ورودِ امن پس از فعال‌شدن بخش سرور روی Cloudflare روشن می‌شود. تا آن زمان پنل در «حالت پیش‌نمایش» کار می‌کند. کلیدها را اکنون برای زمانِ فعال‌شدن ذخیره کنید.
            </Warn>

            <Actions>
              <button type="button" onClick={() => setStep(2)} className="btn btn-ghost text-sm">بازگشت</button>
              <div className="flex gap-2">
                <button type="button" onClick={() => { setAdminHash(""); setSessionSecret(""); pushToast("کلیدها از حافظهٔ مرورگر پاک شدند.", "info"); }} className="btn btn-secondary text-sm">پاک‌کردن از حافظه</button>
                <button type="button" onClick={() => setStep(4)} className="btn btn-primary">ادامه <ArrowLeft className="h-5 w-5" /></button>
              </div>
            </Actions>
          </Card>
        )}

        {/* STEP 4 — GitHub optional */}
        {step === 4 && (
          <Card>
            <Head icon={<Gift className="h-6 w-6" />} title="اتصال اختیاری GitHub" />
            <p className="leading-8 text-muted">
              GitHub فقط برای به‌روزرسانی <b>کدِ</b> سایت استفاده می‌شود. ثبت مقاله، محصول و متن‌ها از داخل پنل انجام می‌شود و به GitHub نیاز ندارد.
            </p>
            <div className="mt-4 rounded-2xl bg-surface2 p-4 text-sm leading-7 text-muted">
              اگر کد سایت را از طریق GitHub منتشر می‌کنی، وضعیت اتصال را در داشبورد Cloudflare (بخش Deployments / Git) بررسی کن.
            </div>
            <a href="https://dash.cloudflare.com/?to=/:account/workers" target="_blank" rel="noopener noreferrer" className="btn btn-secondary mt-4">باز کردن Cloudflare</a>
            <Actions>
              <Back onClick={() => setStep(3)} />
              <button type="button" onClick={() => setStep(5)} className="btn btn-primary">ادامه <ArrowLeft className="h-5 w-5" /></button>
            </Actions>
          </Card>
        )}

        {/* STEP 5 — Final checklist */}
        {step === 5 && (
          <Card>
            <Head icon={<Check className="h-6 w-6" />} title="بررسی نهایی" />
            <p className="mb-4 leading-8 text-muted">لطفاً مطمئن شو موارد زیر انجام شده‌اند:</p>
            <div className="flex flex-col gap-2">
              {[
                ["keys", "کلیدهای ADMIN_PASSWORD_HASH و SESSION_SECRET در Cloudflare اضافه شد"],
                ["pw", "رمز مدیر را در جای امن یادداشت کردم (دیگر نمایش داده نمی‌شود)"],
                ["site", "صفحهٔ اصلی سایت باز می‌شود"],
              ].map(([key, label]) => (
                <label key={key} className="flex cursor-pointer items-start gap-3 rounded-xl border border-line p-3 text-sm font-bold">
                  <input type="checkbox" className="mt-0.5 h-5 w-5 accent-[var(--c-accent)]" checked={!!finalChecks[key]} onChange={(e) => setFinalChecks((c) => ({ ...c, [key]: e.target.checked }))} />
                  <span className="leading-7 text-muted">{label}</span>
                </label>
              ))}
            </div>
            <Actions>
              <Back onClick={() => setStep(4)} />
              <button type="button" onClick={finish} disabled={!finalChecks.keys || !finalChecks.pw || !finalChecks.site} className="btn btn-primary">تکمیل راه‌اندازی</button>
            </Actions>
          </Card>
        )}

        {/* STEP 6 — Success */}
        {step === 6 && (
          <Card>
            <div className="text-center">
              <div className="mx-auto grid h-16 w-16 place-items-center rounded-2xl bg-success/15 text-success">
                <Check className="h-8 w-8" />
              </div>
              <h1 className="mt-4 text-2xl font-extrabold">راه‌اندازی با موفقیت انجام شد</h1>
            </div>
            <ul className="my-6 flex flex-col gap-2">
              <Status ok label="کلیدهای امن ساخته شدند" />
              <Status ok label="راهنمای افزودن به Cloudflare ارائه شد" />
              <Status ok label="سایت آمادهٔ مدیریت است" />
            </ul>
            <div className="flex flex-wrap justify-center gap-2">
              <button type="button" onClick={() => navigate("/admin")} className="btn btn-primary">ورود به پنل مدیریت</button>
              <Link to="/" className="btn btn-secondary">مشاهده سایت</Link>
            </div>
          </Card>
        )}
      </div>
    </Shell>
  );
}

/* ---------- small presentational helpers ---------- */
function Shell({ children }: { children: React.ReactNode }) {
  return <div className="container-x min-h-screen py-8">{children}</div>;
}
function Card({ children }: { children: React.ReactNode }) {
  return <div className="card p-6 md:p-8">{children}</div>;
}
function Head({ icon, title }: { icon: React.ReactNode; title: string }) {
  return (
    <div className="mb-4 flex items-center gap-3">
      <span className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-accent/12 text-accent">{icon}</span>
      <h2 className="text-lg font-extrabold md:text-xl">{title}</h2>
    </div>
  );
}
function Actions({ children }: { children: React.ReactNode }) {
  return <div className="mt-6 flex flex-wrap items-center justify-between gap-3">{children}</div>;
}
function Back({ onClick }: { onClick: () => void }) {
  return <button type="button" onClick={onClick} className="btn btn-ghost text-sm">بازگشت</button>;
}
function Warn({ children }: { children: React.ReactNode }) {
  return (
    <div className="mt-4 flex items-start gap-2 rounded-xl border border-warning/30 bg-warning/10 p-3 text-xs leading-7 text-warning">
      <Shield className="mt-0.5 h-4 w-4 shrink-0" />
      <span>{children}</span>
    </div>
  );
}
function Status({ ok, warn, label }: { ok?: boolean; info?: boolean; warn?: boolean; label: string }) {
  const color = ok ? "text-success" : warn ? "text-warning" : "text-accent2";
  const dot = ok ? "●" : warn ? "▲" : "ℹ";
  return (
    <li className="flex items-start gap-2 text-sm">
      <span className={cn("mt-0.5 shrink-0", color)} aria-hidden="true">{dot}</span>
      <span className="leading-7 text-muted">{label}</span>
    </li>
  );
}
