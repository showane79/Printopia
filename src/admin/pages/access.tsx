import { useState, type FormEvent } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAdminAuth } from "../auth";
import { Field } from "../ui";
import { Cube, Shield } from "@/components/icons";

export function Login() {
  const { login, status } = useAdminAuth();
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
    else if (r.needSetup) navigate("/admin/setup");
    else setErr(r.message || "ورود ناموفق بود.");
  }

  const needsSetup = status.serverAvailable && status.dbOk && !status.setupComplete;

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
          ورود به‌صورت امن و از طریق سرور انجام می‌شود و نشست در یک کوکی امن نگه‌داری می‌شود.
        </p>

        {needsSetup ? (
          <Link to="/admin/setup" className="btn btn-secondary mt-4 w-full">
            تکمیل راه‌اندازی اولیه
          </Link>
        ) : (
          <p className="mt-3 text-center text-sm">
            <Link to="/admin/setup" className="text-accent hover:underline">
              صفحهٔ راه‌اندازی
            </Link>
          </p>
        )}
      </div>
    </div>
  );
}

// The first-run Setup Wizard lives in ./SetupWizard.tsx (imported by AdminApp).
