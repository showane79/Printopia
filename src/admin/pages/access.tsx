import { useState, type FormEvent } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAdminAuth } from "../auth";
import { Field } from "../ui";
import { Check, Cube, Shield } from "@/components/icons";

export function Login() {
  const { login } = useAdminAuth();
  const navigate = useNavigate();
  const [pw, setPw] = useState("");
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState(false);

  async function submit(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    setErr("");
    const r = await login(pw);
    setBusy(false);
    if (r.ok) navigate("/admin/dashboard");
    else setErr(r.message || "ورود ناموفق بود.");
  }

  return (
    <div className="grid min-h-screen place-items-center p-4">
      <div className="card w-full max-w-sm p-7">
        <div className="mb-6 flex flex-col items-center text-center">
          <span className="grid h-12 w-12 place-items-center rounded-xl bg-gradient-to-br from-accent to-[#6d28d9] text-white">
            <Cube className="h-6 w-6" />
          </span>
          <h1 className="mt-3 text-xl font-extrabold">ورود به مدیریت</h1>
          <p className="mt-1 text-sm text-muted">پنل مدیریت محتوای پرینتوپیا</p>
        </div>

        <form onSubmit={submit} className="flex flex-col gap-4">
          <Field label="رمز عبور" htmlFor="pw" error={err}>
            <input
              id="pw"
              type="password"
              className="input"
              value={pw}
              onChange={(e) => setPw(e.target.value)}
              autoFocus
              dir="ltr"
            />
          </Field>
          <button type="submit" disabled={busy} className="btn btn-primary w-full">
            {busy ? "در حال ورود..." : "ورود"}
          </button>
        </form>

        <p className="mt-5 flex items-start gap-2 rounded-xl bg-surface2 p-3 text-xs leading-6 text-muted">
          <Shield className="mt-0.5 h-4 w-4 shrink-0 text-accent" />
          در این پیش‌نمایش، ورود یک دروازهٔ نمایشی است. برای ورود امن واقعی، پنل را روی Cloudflare Pages
          مستقر کنید؛ آن‌گاه تأیید هویت در سمت سرور و با کوکی امن انجام می‌شود.
        </p>
        <p className="mt-3 text-center text-sm">
          <Link to="/admin/setup" className="text-accent hover:underline">
            راه‌اندازی یک‌بارهٔ سایت
          </Link>
        </p>
      </div>
    </div>
  );
}

export function Setup() {
  return (
    <div className="grid min-h-screen place-items-center p-4">
      <div className="card w-full max-w-2xl p-7">
        <h1 className="text-xl font-extrabold">راه‌اندازی یک‌باره</h1>
        <p className="mt-2 leading-8 text-muted">
          برای اینکه انتشار مقاله‌ها به‌صورت خودکار در سایت اعمال شود، فقط یک‌بار دو اتصال انجام می‌دهید.
          پس از آن، هر انتشار از پنل مدیریت به‌طور خودکار در GitHub ذخیره و توسط Cloudflare Pages ساخته
          می‌شود.
        </p>

        <ol className="mt-6 flex flex-col gap-4">
          <li className="card p-5">
            <p className="flex items-center gap-2 font-bold">
              <span className="grid h-7 w-7 place-items-center rounded-full bg-accent/15 text-sm text-accent">۱</span>
              اتصال یک مخزن خصوصی GitHub
            </p>
            <p className="mt-2 text-sm leading-7 text-muted">
              روی دکمهٔ زیر بزنید و فقط یک مخزن را اجازه دهید. نیازی به ساخت یا جای‌گذاری توکن دستی
              (Personal Access Token) نیست.
            </p>
            <a href="/api/admin/oauth/start" className="btn btn-primary mt-3">اتصال به GitHub</a>
            <p className="mt-2 text-xs text-muted">
              این دکمه پس از استقرار روی Cloudflare Pages فعال می‌شود (در پیش‌نمایش مرورگر در دسترس نیست).
            </p>
          </li>

          <li className="card p-5">
            <p className="flex items-center gap-2 font-bold">
              <span className="grid h-7 w-7 place-items-center rounded-full bg-accent/15 text-sm text-accent">۲</span>
              اتصال GitHub به Cloudflare Pages
            </p>
            <p className="mt-2 text-sm leading-7 text-muted">
              در Cloudflare Pages، پروژه را به مخزن GitHub متصل کنید تا هر commit به‌صورت خودکار ساخته و
              منتشر شود. این تأیید فقط مالک حساب می‌تواند انجام دهد و قابل دور زدن نیست.
            </p>
            <a href="https://dash.cloudflare.com/?to=/:account/pages" target="_blank" rel="noopener noreferrer" className="btn btn-secondary mt-3">
              اتصال یک‌بارهٔ GitHub به Cloudflare Pages
            </a>
          </li>

          <li className="card p-5">
            <p className="flex items-center gap-2 font-bold">
              <span className="grid h-7 w-7 place-items-center rounded-full bg-success/15 text-sm text-success">
                <Check className="h-4 w-4" />
              </span>
              آماده!
            </p>
            <p className="mt-2 text-sm leading-7 text-muted">
              پس از این دو اتصال، برای انتشار مقاله‌های جدید دیگر کاری با GitHub یا Cloudflare ندارید؛
              همه‌چیز از پنل مدیریت انجام می‌شود.
            </p>
          </li>
        </ol>

        <p className="mt-6 text-center text-sm">
          <Link to="/admin/login" className="text-accent hover:underline">بازگشت به ورود</Link>
        </p>
      </div>
    </div>
  );
}
