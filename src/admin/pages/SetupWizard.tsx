import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAdminAuth } from "../auth";
import { useStore } from "@/context/StoreContext";
import { ArrowLeft, Check, Cube, Database, Shield } from "@/components/icons";

type Phase = "loading" | "no-server" | "binding-missing" | "unreachable" | "already" | "form" | "done";

function Shell({ children }: { children: React.ReactNode }) {
  return <div className="container-x min-h-screen py-8">{children}</div>;
}
function Card({ children }: { children: React.ReactNode }) {
  return <div className="card mx-auto max-w-2xl p-6 md:p-8">{children}</div>;
}
function Head({ icon, title }: { icon: React.ReactNode; title: string }) {
  return (
    <div className="mb-4 flex items-center gap-3">
      <span className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-accent/12 text-accent">{icon}</span>
      <h2 className="text-lg font-extrabold md:text-xl">{title}</h2>
    </div>
  );
}

const D1_SNIPPET = `"d1_databases": [
  { "binding": "DB", "database_name": "printopia", "database_id": "شناسهٔ پایگاه‌دادهٔ شما" }
]`;

export function Setup() {
  const { status, refresh } = useAdminAuth();
  const { pushToast } = useStore();
  const navigate = useNavigate();

  const [pw, setPw] = useState("");
  const [pw2, setPw2] = useState("");
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);

  const phase: Phase = status.loading
    ? "loading"
    : !status.serverAvailable
    ? "no-server"
    : status.dbState === "binding_missing"
    ? "binding-missing"
    : status.dbState === "unreachable"
    ? "unreachable"
    : status.setupComplete && !done
    ? "already"
    : done
    ? "done"
    : "form";

  const strength = (() => {
    let s = 0;
    if (pw.length >= 8) s++;
    if (pw.length >= 12) s++;
    if (/[A-Za-z]/.test(pw) && /\d/.test(pw)) s++;
    if (/[^A-Za-z0-9]/.test(pw)) s++;
    return Math.min(4, s);
  })();
  const strengthColors = ["#ef4444", "#f97316", "#eab308", "#22c55e", "#16a34a"];
  const strengthLabel = ["بسیار ضعیف", "ضعیف", "متوسط", "خوب", "قوی"][strength] || "خالی";

  async function create() {
    setErr("");
    if (pw.length < 8) { setErr("رمز عبور باید حداقل ۸ نویسه باشد."); return; }
    if (pw !== pw2) { setErr("رمز عبور و تکرار آن یکسان نیستند."); return; }
    setBusy(true);
    try {
      const res = await fetch("/api/admin/setup", {
        method: "POST",
        headers: { "Content-Type": "application/json", Accept: "application/json" },
        body: JSON.stringify({ password: pw, confirm: pw2 }),
      });
      const data = (await res.json().catch(() => ({}))) as { code?: string; message?: string };
      if (res.ok) {
        setPw(""); setPw2("");
        await refresh();
        setDone(true);
        return;
      }
      // Already configured (or duplicate attempt) → sync state and show the right screen.
      if (res.status === 409) {
        await refresh();
        return;
      }
      // Structured error from the server; show the precise Persian reason.
      setErr(data.message || "ساخت حساب مدیر ناموفق بود؛ دوباره تلاش کنید.");
    } catch {
      setErr("اتصال به سرور برقرار نشد؛ دوباره تلاش کنید.");
    } finally {
      setBusy(false);
    }
  }

  function copySnippet() {
    navigator.clipboard?.writeText(D1_SNIPPET).then(
      () => pushToast("کد کپی شد"),
      () => pushToast("کپی ناموفق بود", "error")
    );
  }

  // ---------- LOADING ----------
  if (phase === "loading") {
    return (
      <Shell>
        <Card>
          <div className="flex items-center justify-center gap-3 py-10 text-muted">
            <span className="h-6 w-6 animate-spin rounded-full border-2 border-accent border-t-transparent" />
            <span className="text-sm">در حال بررسی وضعیت راه‌اندازی…</span>
          </div>
        </Card>
      </Shell>
    );
  }

  // ---------- NO SERVER ----------
  if (phase === "no-server") {
    return (
      <Shell>
        <Card>
          <Head icon={<Shield className="h-6 w-6" />} title="بخش سرور هنوز فعال نیست" />
          <p className="leading-8 text-muted">
            کدِ جدید سایت (شامل بخش امن ورود) هنوز روی Cloudflare منتشر نشده است. پس از انتشار، دوباره این صفحه را باز کنید.
          </p>
          <div className="mt-6 flex gap-2">
            <button onClick={refresh} className="btn btn-primary">بررسی دوباره</button>
            <Link to="/" className="btn btn-secondary">مشاهده سایت</Link>
          </div>
        </Card>
      </Shell>
    );
  }

  // ---------- BINDING MISSING (the one correct fix) ----------
  if (phase === "binding-missing") {
    return (
      <Shell>
        <Card>
          <Head icon={<Database className="h-6 w-6" />} title="اتصال پایگاه‌داده به سایت هنوز کامل نشده است" />
          <p className="leading-8 text-muted">
            پایگاه‌داده ساخته شده، اما سایت در نسخهٔ فعلی هنوز به آن دسترسی ندارد. چون سایت از GitHub منتشر می‌شود،
            اتصالی که فقط در داشبوردِ Cloudflare اضافه کرده‌اید، در انتشارِ بعدی نگه‌داری نمی‌شود. اتصال باید در فایل
            پیکربندی ثبت شود.
          </p>

          <ol className="mt-4 list-decimal space-y-2 pe-5 text-sm leading-7 text-muted">
            <li>در داشبورد Cloudflare به <b>Workers &amp; Pages → D1</b> بروید، پایگاه‌دادهٔ <code dir="ltr">printopia</code> را باز کنید و <b>Database ID</b> را کپی کنید.</li>
            <li>در مخزن GitHub، فایل <code dir="ltr">wrangler.jsonc</code> را ویرایش کنید.</li>
            <li>بخشِ <code dir="ltr">d1_databases</code> را از حالت یادداشت خارج کنید و <b>شناسهٔ واقعی</b> پایگاه‌داده را در آن بگذارید (شناسهٔ ساختگی خطای ۱۰۰۳۲۴/۱۰۰۲۱ می‌دهد).</li>
            <li>تغییر را ذخیره (commit) کنید تا Cloudflare دوباره سایت را بسازد.</li>
          </ol>

          <div className="mt-4 rounded-xl border border-line bg-surface2 p-3">
            <div className="mb-2 flex items-center justify-between">
              <span className="text-xs font-bold text-muted">بخش موردنیاز در wrangler.jsonc</span>
              <button onClick={copySnippet} className="btn btn-secondary px-3 py-1 text-xs">کپی</button>
            </div>
            <pre dir="ltr" className="overflow-x-auto whitespace-pre-wrap break-all rounded-lg bg-canvas p-3 text-[11px] leading-6 text-muted">{D1_SNIPPET}</pre>
          </div>

          <div className="mt-6 flex flex-wrap gap-2">
            <button onClick={refresh} className="btn btn-primary">بررسی دوباره</button>
            <a href="https://dash.cloudflare.com/?to=/:account/workers/d1" target="_blank" rel="noopener noreferrer" className="btn btn-secondary">باز کردن Cloudflare D1</a>
          </div>
        </Card>
      </Shell>
    );
  }

  // ---------- UNREACHABLE ----------
  if (phase === "unreachable") {
    return (
      <Shell>
        <Card>
          <Head icon={<Database className="h-6 w-6" />} title="پایگاه‌داده پیدا شد، اما پاسخ‌گو نیست" />
          <p className="leading-8 text-muted">
            اتصال برقرار است، اما بررسیِ داخلیِ پایگاه‌داده با خطا روبه‌رو شد. این حالت معمولاً موقتی است.
          </p>
          <div className="mt-6 flex flex-wrap gap-2">
            <button onClick={refresh} className="btn btn-primary">بررسی دوباره</button>
            <Link to="/admin/login" className="btn btn-secondary">نمایش راهنما</Link>
          </div>
        </Card>
      </Shell>
    );
  }

  // ---------- ALREADY CONFIGURED ----------
  if (phase === "already") {
    return (
      <Shell>
        <Card>
          <div className="text-center">
            <div className="mx-auto grid h-16 w-16 place-items-center rounded-2xl bg-success/15 text-success">
              <Check className="h-8 w-8" />
            </div>
            <h2 className="mt-4 text-2xl font-extrabold">راه‌اندازی قبلاً کامل شده</h2>
            <p className="mt-2 leading-8 text-muted">برای امنیت، تنظیمات حساس فقط پس از ورود قابل‌مشاهده هستند.</p>
            <div className="mt-6 flex flex-wrap justify-center gap-2">
              <button onClick={() => navigate("/admin/login")} className="btn btn-primary">رفتن به ورود مدیریت</button>
              <Link to="/" className="btn btn-secondary">مشاهده سایت</Link>
            </div>
          </div>
        </Card>
      </Shell>
    );
  }

  // ---------- DONE ----------
  if (phase === "done") {
    return (
      <Shell>
        <Card>
          <div className="text-center">
            <div className="mx-auto grid h-16 w-16 place-items-center rounded-2xl bg-success/15 text-success">
              <Check className="h-8 w-8" />
            </div>
            <h2 className="mt-4 text-2xl font-extrabold">راه‌اندازی با موفقیت انجام شد</h2>
            <p className="mt-2 leading-8 text-muted">حساب مدیر ساخته شد. اکنون می‌توانید وارد پنل مدیریت شوید.</p>
          </div>
          <ul className="my-6 flex flex-col gap-2">
            <li className="flex items-center gap-2 text-sm text-muted"><Check className="h-4 w-4 text-success" /> پایگاه‌داده آماده است</li>
            <li className="flex items-center gap-2 text-sm text-muted"><Check className="h-4 w-4 text-success" /> حساب مدیر ساخته شد</li>
            <li className="flex items-center gap-2 text-sm text-muted"><Check className="h-4 w-4 text-success" /> ورود امن فعال است</li>
          </ul>
          <div className="flex flex-wrap justify-center gap-2">
            <button onClick={() => navigate("/admin")} className="btn btn-primary">ورود به پنل مدیریت</button>
            <Link to="/" className="btn btn-secondary">مشاهده سایت</Link>
          </div>
        </Card>
      </Shell>
    );
  }

  // ---------- FORM (create admin) ----------
  return (
    <Shell>
      <Card>
        <div className="mb-2 flex items-center justify-between">
          <span className="text-xs text-muted">گام ۱ از ۱</span>
          <span className="font-bold text-accent">ساخت حساب مدیر</span>
        </div>
        <div className="mb-5 h-2 overflow-hidden rounded-full bg-surface2">
          <div className="h-full rounded-full bg-gradient-to-l from-accent to-accent2" style={{ width: "100%" }} />
        </div>

        <Head icon={<Cube className="h-6 w-6" />} title="ساخت حساب مدیر" />
        <p className="leading-8 text-muted">
          پایگاه‌داده آماده است و جدول‌های لازم به‌صورت خودکار ایجاد شدند. حالا یک رمز عبور برای مدیر سایت تعریف کنید.
          ما رمز را امن ذخیره می‌کنیم؛ نیازی به ساخت هش یا کلید نیست.
        </p>

        <div className="mt-4 flex flex-col gap-4">
          <div>
            <label htmlFor="pw" className="mb-2 block text-sm font-bold">رمز عبور</label>
            <input id="pw" type="password" dir="ltr" className="input text-start" value={pw} onChange={(e) => setPw(e.target.value)} autoComplete="new-password" />
          </div>
          <div className="flex items-center gap-2">
            <div className="flex flex-1 gap-1">
              {[0, 1, 2, 3, 4].map((i) => (
                <span key={i} className="h-1.5 flex-1 rounded-full transition-colors" style={{ backgroundColor: pw && i <= strength ? strengthColors[strength] : "var(--c-surface2)" }} />
              ))}
            </div>
            <span className="w-20 text-xs text-muted">{pw ? strengthLabel : "خالی"}</span>
          </div>
          <div>
            <label htmlFor="pw2" className="mb-2 block text-sm font-bold">تکرار رمز عبور</label>
            <input id="pw2" type="password" dir="ltr" className="input text-start" value={pw2} onChange={(e) => setPw2(e.target.value)} autoComplete="new-password" />
          </div>
          {err && <p role="alert" className="text-sm text-danger">{err}</p>}
          <p className="rounded-xl bg-surface2 p-3 text-xs leading-6 text-muted">
            پیشنهاد: حداقل ۱۲ نویسه، ترکیبی از حرف، عدد و نشانه. رمز را در جای امن نگه دار و با کسی به اشتراک نگذار.
          </p>
        </div>

        <div className="mt-6 flex flex-wrap items-center justify-between gap-3">
          <Link to="/" className="btn btn-ghost text-sm">انصراف</Link>
          <button onClick={create} disabled={busy} className="btn btn-primary">
            {busy ? "در حال ساخت حساب مدیر..." : "ساخت حساب مدیر و پایان راه‌اندازی"} <ArrowLeft className="h-5 w-5" />
          </button>
        </div>
      </Card>
    </Shell>
  );
}
