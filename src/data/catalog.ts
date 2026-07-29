import { images } from "@/assets";

export interface Category {
  id: string;
  slug: string;
  name: string;
  blurb: string;
  image: string;
}

export const categories: Category[] = [
  {
    id: "action-figures",
    slug: "action-figures",
    name: "اکشن فیگور",
    blurb: "فیگورهای کلکسیونی با جزئیات بالا و حالت‌های پویا.",
    image: images.actionFigure,
  },
  {
    id: "fantasy",
    slug: "fantasy",
    name: "فیگورهای فانتزی",
    blurb: "موجودات افسانه‌ای و خیالی برای طرفداران دنیای فانتزی.",
    image: images.fantasyFigure,
  },
  {
    id: "statues",
    slug: "statues",
    name: "مجسمه و دکوری",
    blurb: "مجسمه‌های تزئینی و هنری برای خانه و فضای کار.",
    image: images.customGift,
  },
  {
    id: "home",
    slug: "home",
    name: "گلدان و لوازم خانه",
    blurb: "گلدان‌ها و دکوری‌های کاربردی با طراحی مدرن.",
    image: images.planter,
  },
  {
    id: "desk",
    slug: "desk",
    name: "اکسسوری میز کار",
    blurb: "سازمان‌دهنده و زیباساز میز کار شما.",
    image: images.deskOrganizer,
  },
  {
    id: "gadgets",
    slug: "gadgets",
    name: "هولدر موبایل و گجت",
    blurb: "استندهای کاربردی برای گوشی و لوازم جانبی.",
    image: images.phoneHolder,
  },
  {
    id: "gifts",
    slug: "gifts",
    name: "هدیه شخصی‌سازی‌شده",
    blurb: "هدیه‌هایی منحصربه‌فرد با نام، تاریخ یا طرح دلخواه.",
    image: images.customGift,
  },
  {
    id: "custom",
    slug: "custom",
    name: "قطعات سفارشی و چاپ اختصاصی",
    blurb: "طرح اختصاصی شما، از فایل سه‌بعدی تا محصول نهایی.",
    image: images.customGift,
  },
  {
    id: "keychain",
    slug: "keychain",
    name: "جاکلیدی و اکسسوری کوچک",
    blurb: "جاکلیدی‌های کلکسیونی و هدیه‌های کوچک جذاب.",
    image: images.keychain,
  },
  {
    id: "gaming",
    slug: "gaming",
    name: "محصولات مناسب گیمینگ",
    blurb: "برج تاس، استند هدست و دکوری برای گیمرها.",
    image: images.gaming,
  },
];

export function getCategory(id: string): Category | undefined {
  return categories.find((c) => c.id === id || c.slug === id);
}

// Hand-picked tiles for the homepage Bento grid.
export interface BentoTile {
  id: string;
  name: string;
  blurb: string;
  image: string;
  to: string;
  span: "lg" | "md" | "sm"; // visual weight inside the bento grid
}

export const bentoCategories: BentoTile[] = [
  {
    id: "action-figures",
    name: "اکشن فیگور",
    blurb: "جزئیات بالا، حالت‌های پویا و طراحی کلکسیونی.",
    image: images.actionFigure,
    to: "/shop?cat=action-figures",
    span: "lg",
  },
  {
    id: "fantasy",
    name: "فیگور فانتزی",
    blurb: "موجودات افسانه‌ای برای دنیای خیال شما.",
    image: images.fantasyFigure,
    to: "/shop?cat=fantasy",
    span: "md",
  },
  {
    id: "home",
    name: "دکور و گلدان",
    blurb: "زیبایی کاربردی برای خانه و میز.",
    image: images.planter,
    to: "/shop?cat=home",
    span: "md",
  },
  {
    id: "gaming",
    name: "گیمینگ",
    blurb: "برج تاس، استند هدست و دکوری میز گیم.",
    image: images.gaming,
    to: "/shop?cat=gaming",
    span: "sm",
  },
  {
    id: "gifts",
    name: "هدیه سفارشی",
    blurb: "نام، تاریخ یا طرح دلخواه، فقط برای او.",
    image: images.customGift,
    to: "/shop?cat=gifts",
    span: "sm",
  },
  {
    id: "custom",
    name: "چاپ اختصاصی",
    blurb: "طرح اختصاصی خودتان را بسازید.",
    image: images.deskOrganizer,
    to: "/custom",
    span: "sm",
  },
];

export interface Collection {
  id: string;
  name: string;
  blurb: string;
  image: string;
  to: string;
}

export const collections: Collection[] = [
  {
    id: "gamers",
    name: "برای گیمرها",
    blurb: "دکوری و ابزار میز گیم با روحیه بازی.",
    image: images.gaming,
    to: "/shop?cat=gaming",
  },
  {
    id: "gifts",
    name: "هدیه‌های خاص",
    blurb: "هدیه‌هایی که جای یادگاری دارند.",
    image: images.customGift,
    to: "/shop?cat=gifts",
  },
  {
    id: "desk",
    name: "دکور میز کار",
    blurb: "میزی منظم، زیبا و الهام‌بخش.",
    image: images.deskOrganizer,
    to: "/shop?cat=desk",
  },
  {
    id: "fantasy",
    name: "کلکسیون فانتزی",
    blurb: "سفری به دنیای اژدهایان و افسانه‌ها.",
    image: images.fantasyFigure,
    to: "/shop?cat=fantasy",
  },
];
