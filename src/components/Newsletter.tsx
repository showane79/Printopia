import { useState, type FormEvent } from "react";
import { useStore } from "@/context/StoreContext";
import { Mail } from "@/components/icons";

export function Newsletter() {
  const { pushToast } = useStore();
  const [email, setEmail] = useState("");
  const [error, setError] = useState("");

  function submit(e: FormEvent) {
    e.preventDefault();
    const ok = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim());
    if (!ok) {
      setError("لطفاً یک ایمیل معتبر وارد کنید.");
      return;
    }
    setError("");
    setEmail("");
    pushToast("عضویت شما در خبرنامه ثبت شد 🎉");
  }

  return (
    <div className="card overflow-hidden">
      <div className="grid gap-6 p-7 md:grid-cols-2 md:items-center md:p-10">
        <div>
          <span className="chip mb-3 border-accent2/30 bg-accent2/10 text-accent2">خبرنامه پرینتوپیا</span>
          <h2 className="text-2xl font-extrabold md:text-3xl">
            از جدیدترین فیگورها، تخفیف‌ها و طرح‌های محدود باخبر شوید
          </h2>
          <p className="mt-3 leading-8 text-muted">
            ایمیل خود را وارد کنید تا اولین نفرهایی باشید که از محصولات جدید و پیشنهادهای ویژه مطلع می‌شوید.
          </p>
        </div>
        <form onSubmit={submit} noValidate>
          <label htmlFor="nl-email" className="sr-only">
            ایمیل
          </label>
          <div className="flex flex-col gap-3 sm:flex-row">
            <div className="relative flex-1">
              <span className="pointer-events-none absolute inset-y-0 grid w-11 place-items-center text-muted" style={{ insetInlineStart: 0 }}>
                <Mail className="h-5 w-5" />
              </span>
              <input
                id="nl-email"
                type="email"
                inputMode="email"
                dir="ltr"
                placeholder="you@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                aria-invalid={!!error}
                aria-describedby={error ? "nl-error" : undefined}
                className="input pe-3"
                style={{ paddingInlineStart: "2.75rem", textAlign: "start" }}
              />
            </div>
            <button type="submit" className="btn btn-primary shrink-0">
              عضویت
            </button>
          </div>
          {error && (
            <p id="nl-error" role="alert" className="mt-2 text-sm text-danger">
              {error}
            </p>
          )}
        </form>
      </div>
    </div>
  );
}
