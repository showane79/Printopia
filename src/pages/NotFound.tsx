import { Link } from "react-router-dom";
import { useSeo } from "@/components/Seo";

export default function NotFound() {
  useSeo({ title: "صفحه پیدا نشد (۴۰۴) | پرینتوپیا" });
  return (
    <div className="container-x py-16 text-center md:py-24">
      <p className="text-7xl font-extrabold text-gradient md:text-8xl">۴۰۴</p>
      <h1 className="mt-4 text-2xl font-extrabold md:text-3xl">صفحه مورد نظر پیدا نشد</h1>
      <p className="mx-auto mt-3 max-w-md leading-8 text-muted">
        ممکن است آدرس را اشتباه وارد کرده باشید یا این صفحه دیگر موجود نباشد.
      </p>
      <div className="mt-7 flex flex-wrap justify-center gap-2">
        <Link to="/" className="btn btn-primary">بازگشت به خانه</Link>
        <Link to="/shop" className="btn btn-secondary">رفتن به فروشگاه</Link>
        <Link to="/contact" className="btn btn-ghost">تماس با پشتیبانی</Link>
      </div>
      <div className="mx-auto mt-10 flex max-w-md flex-wrap justify-center gap-2">
        {[
          { label: "اکشن فیگور", to: "/shop?cat=action-figures" },
          { label: "محصولات گیمینگ", to: "/shop?cat=gaming" },
          { label: "چاپ اختصاصی", to: "/custom" },
          { label: "مجله", to: "/blog" },
        ].map((l) => (
          <Link key={l.to} to={l.to} className="chip hover:border-accent">
            {l.label}
          </Link>
        ))}
      </div>
    </div>
  );
}
