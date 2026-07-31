import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAdminAuth } from "../auth";
import { useStore } from "@/context/StoreContext";
import { ArrowLeft, Check, Cube, Database, Shield } from "@/components/icons";

type Phase = "loading" | "no-server" | "cloudflare-connect" | "cloudflare-working" | "unreachable" | "already" | "form" | "done";

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

/**
 * `optional` steps (image storage) may fail without failing the setup, so they
 * render as "skipped" and are excluded from the success check.
 */
interface ProvisionStep { key: string; label: string; ok: boolean; detail?: string; optional?: boolean }


export function Setup() {
  const { status, refresh } = useAdminAuth();
  const { pushToast } = useStore();
  const navigate = useNavigate();

  const [token, setToken] = useState("");
  const [tokenErr, setTokenErr] = useState("");
  const [tokenBusy, setTokenBusy] = useState(false);
  const [provisionSteps, setProvisionSteps] = useState<ProvisionStep[]>([]);
  const [wranglerSnippet, setWranglerSnippet] = useState("");

  const [pw, setPw] = useState("");
  const [pw2, setPw2] = useState("");
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);

  const phase: Phase = status.loading
    ? "loading"
    : !status.serverAvailable
    ? "no-server"
    : status.dbState === "unreachable"
    ? "unreachable"
    : status.setupComplete && !done
    ? "already"
    : !status.cloudflareConnected && provisionSteps.length === 0
    ? "cloudflare-connect"
    : !status.cloudflareConnected && provisionSteps.length > 0
    ? "cloudflare-working"
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

  async function connectCloudflare() {
    setTokenErr("");
    const clean = token.trim();
    if (!clean) { setTokenErr("توکن را وارد کنید."); return; }
    setTokenBusy(true);
    setProvisionSteps([]);
    try {
      const res = await fetch("/api/admin/setup-cloudflare", {
        method: "POST",
        headers: { "Content-Type": "application/json", Accept: "application/json" },
        body: JSON.stringify({ token: clean }),
      });
      const data = await res.json().catch(() => ({})) as { ok?: boolean; steps?: ProvisionStep[]; wranglerSnippet?: string; message?: string };
      if (res.ok && data.ok) {
        setProvisionSteps(data.steps ?? []);
        setWranglerSnippet(data.wranglerSnippet ?? "");
        await refresh();
        pushToast("اتصال Cloudflare با موفقیت انجام شد", "success");
        return;
      }
      setProvisionSteps(data.steps ?? []);
      setTokenErr(data.message || "اتصال ناموفق بود؛ پیام خطا را بخوانید و دوباره تلاش کنید.");
    } catch {
      setTokenErr("اتصال به سرور برقرار نشد؛ دوباره تلاش کنید.");
    } finally {
      setTokenBusy(false);
    }
  }

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
      if (res.status === 409) {
        await refresh();
        return;
      }
      setErr(data.message || "ساخت حساب مدیر ناموفق بود؛ دوباره تلاش کنید.");
    } catch {
      setErr("اتصال به سرور برقرار نشد؛ دوباره تلاش کنید.");
    } finally {
      setBusy(false);
    }
  }

  function copySnippet(text: string) {
    navigator.clipboard?.writeText(text).then(
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

  // ---------- CLOUDFLARE CONNECT (new one-click flow) ----------
  if (phase === "cloudflare-connect") {
    return (
      <Shell>
        <Card>
          <div className="mb-2 flex items-center justify-between">
            <span className="text-xs text-muted">گام ۱ از ۲</span>
            <span className="font-bold text-accent">اتصال Cloudflare</span>
          </div>
          <div className="mb-5 h-2 overflow-hidden rounded-full bg-surface2">
            <div className="h-full rounded-full bg-gradient-to-l from-accent to-accent2" style={{ width: "50%" }} />
          </div>

          <Head icon={<Database className="h-6 w-6" />} title="ساخت خودکار پایگاه‌داده" />
          <p className="leading-8 text-muted">
            برای ذخیرهٔ محتوای سایت (مقالات، محصولات، تنظیمات) به یک پایگاه‌دادهٔ D1 نیاز داریم.
            با یک توکن API از Cloudflare، همه چیز خودکار آماده می‌شود: ساخت پایگاه‌داده، ایجاد جدول‌ها و اتصال امن.
          </p>

          <div className="mt-4 rounded-xl border border-line bg-surface2 p-4">
            <h3 className="mb-2 text-sm font-bold">چگونه توکن بسازم؟</h3>
            <ol className="list-decimal space-y-2 pe-5 text-sm leading-7 text-muted">
              <li>به <a href="https://dash.cloudflare.com/profile/api-tokens" target="_blank" rel="noopener noreferrer" className="text-accent hover:underline">داشبورد API Tokens</a> بروید و <b>Create Token</b> را بزنید.</li>
              <li><b>Create Custom Token</b> را انتخاب کنید.</li>
              <li>سه دسترسی زیر را اضافه کنید:
                <ul className="mt-1 list-disc pe-5">
                  <li><code dir="ltr">Account Settings: Read</code></li>
                  <li><code dir="ltr">D1: Edit</code></li>
                  <li><code dir="ltr">Workers Scripts: Edit</code></li>
                </ul>
                {/* Stated up-front so a missing bucket later is never a surprise. */}
                <p className="mt-2">
                  اگر می‌خواهید بتوانید تصویر بارگذاری کنید، این مورد را هم اضافه کنید (اختیاری):
                  {" "}<code dir="ltr">Workers R2 Storage: Edit</code>. بدون آن هم همهٔ بخش‌های دیگر کار می‌کنند.
                </p>
              </li>

              <li>توکن را بسازید، کپی کنید و در کادر زیر وارد کنید.</li>
            </ol>
          </div>

          <div className="mt-4 flex flex-col gap-4">
            <div>
              <label htmlFor="token" className="mb-2 block text-sm font-bold">توکن API</label>
              <input
                id="token"
                type="password"
                dir="ltr"
                className="input text-start"
                placeholder="paste your Cloudflare API token here"
                value={token}
                onChange={(e) => setToken(e.target.value)}
                autoComplete="off"
              />
            </div>
            {tokenErr && <p role="alert" className="text-sm text-danger">{tokenErr}</p>}
            <p className="rounded-xl bg-accent/10 p-3 text-xs leading-6 text-muted">
              <strong>امنیت:</strong> توکن فقط یک‌بار برای ساخت پایگاه‌داده استفاده می‌شود و در مخزن GitHub ذخیره نمی‌شود.
              دسترسی‌های درخواستی فقط برای D1 و تنظیمات Worker است، نه کل حساب شما.
            </p>
          </div>

          <div className="mt-6 flex flex-wrap items-center justify-between gap-3">
            <Link to="/" className="btn btn-ghost text-sm">انصراف</Link>
            <button onClick={connectCloudflare} disabled={tokenBusy} className="btn btn-primary">
              {tokenBusy ? "در حال اتصال..." : "اتصال و ساخت پایگاه‌داده"} <ArrowLeft className="h-5 w-5" />
            </button>
          </div>
        </Card>
      </Shell>
    );
  }

  // ---------- CLOUDFLARE WORKING (show provisioning results) ----------
  if (phase === "cloudflare-working") {
    // Optional steps are excluded: setup succeeds even with image storage off.
    const required = provisionSteps.filter((s) => !s.optional);
    const allOk = required.length > 0 && required.every((s) => s.ok);
    const skipped = provisionSteps.some((s) => s.optional && !s.ok);
    return (
      <Shell>
        <Card>
          <Head icon={<Database className="h-6 w-6" />} title={allOk ? "اتصال موفق بود" : "خطا در برقراری اتصال"} />
          <div className="space-y-2">
            {provisionSteps.map((step) => {
              // Neutral, not red: a skipped optional step is an expected outcome.
              const state = step.ok ? "ok" : step.optional ? "skipped" : "failed";
              return (
                <div key={step.key} className="flex items-start gap-3 rounded-xl border border-line bg-surface2 p-3">
                  <span className={`mt-0.5 grid h-5 w-5 shrink-0 place-items-center rounded-full ${
                    state === "ok" ? "bg-success/15 text-success"
                    : state === "skipped" ? "bg-surface2 text-muted"
                    : "bg-danger/15 text-danger"
                  }`}>
                    {state === "ok" ? <Check className="h-3 w-3" /> : state === "skipped" ? "—" : "✕"}
                  </span>
                  <div className="minw-0 flex-1">
                    <p className="text-sm font-bold">
                      {step.label}
                      {state === "skipped" && <span className="ms-2 text-xs font-normal text-muted">(فعلاً غیرفعال)</span>}
                    </p>
                    {step.detail && <p className="mt-1 text-xs text-muted">{step.detail}</p>}
                  </div>
                </div>
              );
            })}
          </div>

          {allOk && skipped && (
            <p className="mt-3 rounded-xl border border-line bg-surface2 p-3 text-xs leading-6 text-muted">
              راه‌اندازی کامل شد. فقط «بارگذاری تصویر» فعلاً در دسترس نیست؛ می‌توانید همهٔ بخش‌های دیگر را استفاده کنید و
              هر وقت خواستید، از صفحهٔ «رسانه‌ها» با یک کلیک دوباره آن را فعال کنید.
            </p>
          )}


          {allOk && wranglerSnippet && (
            <div className="mt-4 rounded-xl border border-success/30 bg-success/5 p-4">
              <h3 className="mb-2 flex items-center gap-2 text-sm font-bold text-success">
                <Check className="h-4 w-4" /> پایگاه‌داده آماده است
              </h3>
              <p className="mb-3 text-xs leading-6 text-muted">
                اتصال REST فعال است و CMS همین الان کار می‌کند. برای سرعت بیشتر (اتصال مستقیم به جای REST)،
                این کد را در فایل <code dir="ltr">wrangler.jsonc</code> در مخزن GitHub قرار دهید:
              </p>
              <div className="rounded-xl border border-line bg-surface2 p-3">
                <div className="mb-2 flex items-center justify-between">
                  <span className="text-xs font-bold text-muted">کد پیشنهادی برای wrangler.jsonc</span>
                  <button onClick={() => copySnippet(wranglerSnippet)} className="btn btn-secondary px-3 py-1 text-xs">کپی</button>
                </div>
                <pre dir="ltr" className="overflow-x-auto whitespace-pre-wrap break-all rounded-lg bg-canvas p-3 text-[11px] leading-6 text-muted">{wranglerSnippet}</pre>
              </div>
              <p className="mt-2 text-xs text-muted">
                (این مرحله اختیاری است — فقط برای بهینه‌سازی سرعت. CMS بدون این هم کار می‌کند.)
              </p>
            </div>
          )}

          <div className="mt-6 flex flex-wrap gap-2">
            {allOk ? (
              <>
                <button onClick={refresh} className="btn btn-primary">ادامه به ساخت حساب مدیر</button>
                <Link to="/" className="btn btn-secondary">مشاهده سایت</Link>
              </>
            ) : (
              <>
                <button onClick={() => { setProvisionSteps([]); setTokenErr(""); setToken(""); }} className="btn btn-primary">تلاش دوباره</button>
                <Link to="/" className="btn btn-secondary">انصراف</Link>
              </>
            )}
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
          <span className="text-xs text-muted">گام ۲ از ۲</span>
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
