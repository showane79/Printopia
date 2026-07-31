// Editable site-wide configuration: brand identity, contact details,
// navigation, footer columns and operational thresholds.
export const site = {
  brand: "پرینتوپیا",
  brandLatin: "Printopia",
  tagline: "ایده‌ها را به واقعیت سه‌بعدی تبدیل می‌کنیم",
  currency: "تومان",
  freeShippingThreshold: 500_000, // Toman
  phone: "۰۲۱-۹۱۰۰۲۰۳۰",
  phoneHref: "tel:+982191002030",
  email: "hello@printopia.example",
  address: "تهران، خیابان ولیعصر، نبش کوچه گلستان، پلاک ۱۲۰، طبقه سوم",
  workingHours: "شنبه تا پنجشنبه، ساعت ۹ تا ۱۸",
  whatsappNumber: "989120000000",
  social: {
    instagram: "https://instagram.com/",
    telegram: "https://telegram.org/",
    aparat: "https://aparat.com/",
  },
} as const;

export interface NavItem {
  label: string;
  to: string;
}

export const mainNav: NavItem[] = [
  { label: "خانه", to: "/" },
  { label: "فروشگاه", to: "/shop" },
  { label: "اکشن فیگور", to: "/shop?cat=action-figures" },
  { label: "محصولات سفارشی", to: "/shop?custom=1" },
  { label: "چاپ سه‌بعدی اختصاصی", to: "/custom" },
  { label: "مجله", to: "/blog" },
  { label: "درباره ما", to: "/about" },
  { label: "تماس با ما", to: "/contact" },
];

export const footerColumns: { title: string; links: NavItem[] }[] = [
  {
    title: "فروشگاه",
    links: [
      { label: "همه محصولات", to: "/shop" },
      { label: "اکشن فیگور", to: "/shop?cat=action-figures" },
      { label: "فیگور فانتزی", to: "/shop?cat=fantasy" },
      { label: "گلدان و دکوری", to: "/shop?cat=home" },
      { label: "محصولات گیمینگ", to: "/shop?cat=gaming" },
    ],
  },
  {
    title: "خدمات",
    links: [
      { label: "چاپ سه‌بعدی اختصاصی", to: "/custom" },
      { label: "هدیه شخصی‌سازی‌شده", to: "/shop?cat=gifts" },
      { label: "قطعات سفارشی", to: "/custom" },
      { label: "سؤالات متداول", to: "/faq" },
      { label: "مجله پرینتوپیا", to: "/blog" },
    ],
  },
  {
    title: "راهنما",
    links: [
      { label: "درباره ما", to: "/about" },
      { label: "تماس با ما", to: "/contact" },
      { label: "ارسال و مرجوعی", to: "/shipping" },
      { label: "حریم خصوصی", to: "/privacy" },
      { label: "قوانین و مقررات", to: "/terms" },
    ],
  },
];
