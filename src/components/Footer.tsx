import { Link } from "react-router-dom";
import { footerColumns, site } from "@/data/site";
import { Instagram, Layers, Mail, MapPin, Phone, Send, Shield, Whatsapp } from "@/components/icons";

function SocialLink({ href, label, children }: { href: string; label: string; children: React.ReactNode }) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      aria-label={label}
      className="grid h-10 w-10 place-items-center rounded-xl border border-line bg-surface2 text-fg transition-colors hover:border-accent hover:text-accent"
    >
      {children}
    </a>
  );
}

export function Footer() {
  return (
    <footer className="mt-20 border-t border-line bg-surface/40">
      <div className="container-x py-12">
        <div className="grid gap-10 md:grid-cols-12">
          {/* brand */}
          <div className="md:col-span-3">
            <Link to="/" className="flex items-center gap-2" aria-label={site.brand}>
              <span className="grid h-10 w-10 place-items-center rounded-xl bg-gradient-to-br from-accent to-[#6d28d9] text-white shadow-lg shadow-accent/30">
                <Layers className="h-6 w-6" />
              </span>
              <span className="text-lg font-extrabold">{site.brand}</span>
            </Link>
            <p className="mt-4 max-w-xs text-sm leading-7 text-muted">{site.tagline}.</p>
            <p className="mt-2 text-sm leading-7 text-muted">
              فروشگاه تخصصی محصولات چاپ سه‌بعدی، کلکسیون و هدیه‌های شخصی‌سازی‌شده با کیفیتی که دیده می‌شود.
            </p>
            <div className="mt-5 flex gap-2">
              <SocialLink href={site.social.instagram} label="اینستاگرام">
                <Instagram className="h-5 w-5" />
              </SocialLink>
              <SocialLink href={site.social.telegram} label="تلگرام">
                <Send className="h-5 w-5" />
              </SocialLink>
              <SocialLink href={`https://wa.me/${site.whatsappNumber}`} label="واتساپ">
                <Whatsapp className="h-5 w-5" />
              </SocialLink>
            </div>
          </div>

          {/* link columns */}
          {footerColumns.map((col) => (
            <div key={col.title} className="md:col-span-2">
              <h3 className="mb-3 text-sm font-extrabold">{col.title}</h3>
              <ul className="flex flex-col gap-2.5">
                {col.links.map((l) => (
                  <li key={l.to + l.label}>
                    <Link to={l.to} className="text-sm text-muted transition-colors hover:text-accent">
                      {l.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}

          {/* contact */}
          <div className="md:col-span-3">
            <h3 className="mb-3 text-sm font-extrabold">تماس با ما</h3>
            <ul className="flex flex-col gap-3 text-sm text-muted">
              <li className="flex items-start gap-2">
                <Phone className="mt-0.5 h-4 w-4 shrink-0 text-accent" />
                <a href={site.phoneHref} dir="ltr" className="hover:text-accent">
                  {site.phone}
                </a>
              </li>
              <li className="flex items-start gap-2">
                <Mail className="mt-0.5 h-4 w-4 shrink-0 text-accent" />
                <a href={`mailto:${site.email}`} dir="ltr" className="hover:text-accent">
                  {site.email}
                </a>
              </li>
              <li className="flex items-start gap-2">
                <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-accent" />
                <span>{site.address}</span>
              </li>
            </ul>

            <div className="mt-5 flex flex-wrap gap-2">
              <span className="chip"><Shield className="h-3.5 w-3.5" /> پرداخت امن</span>
              <span className="chip">ارسال سریع</span>
              <span className="chip">ضمانت کیفیت</span>
            </div>
          </div>
        </div>

        <div className="mt-10 flex flex-col gap-3 border-t border-line pt-6 text-sm text-muted sm:flex-row sm:items-center sm:justify-between">
          <p>© {new Date().getFullYear().toLocaleString("fa-IR")} پرینتوپیا — تمامی حقوق محفوظ است.</p>
          <div className="flex flex-wrap gap-4">
            <Link to="/privacy" className="hover:text-accent">حریم خصوصی</Link>
            <Link to="/terms" className="hover:text-accent">قوانین و مقررات</Link>
            <Link to="/shipping" className="hover:text-accent">ارسال و مرجوعی</Link>
          </div>
        </div>
      </div>
    </footer>
  );
}
