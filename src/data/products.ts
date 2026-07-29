import { images } from "@/assets";

export type MaterialId = "PLA" | "PETG" | "Resin" | "TPU";

export const materials: Record<MaterialId, { label: string; note: string }> = {
  PLA: { label: "PLA", note: "زیست‌تخریب‌پذیر، سبک و مناسب دکوری" },
  PETG: { label: "PETG", note: "مقاوم و بادوام در برابر ضربه" },
  Resin: { label: "رزین", note: "دقت و جزئیات فوق‌العاده بالا" },
  TPU: { label: "TPU", note: "انعطاف‌پذیر و ضدشکست" },
};

export interface ColorOption {
  name: string;
  hex: string;
}

export interface SizeOption {
  name: string;
  delta: number; // added to base price
}

export interface Product {
  id: string;
  slug: string;
  title: string;
  subtitle: string;
  category: string;
  collectionIds: string[];
  price: number;
  oldPrice?: number;
  image: string;
  material: MaterialId;
  materials: MaterialId[];
  colors: ColorOption[];
  sizes: SizeOption[];
  customizable: boolean;
  inStock: boolean;
  suitableFor: string[];
  badge?: string;
  featured: boolean;
  productionDays: number;
  shortDesc: string;
  description: string;
  features: string[];
  specs: { label: string; value: string }[];
  care: string;
}

const C = {
  violet: { name: "بنفش کهکشانی", hex: "#8b5cf6" },
  cyan: { name: "فیروزه‌ای نئون", hex: "#22d3ee" },
  graphite: { name: "خاکستری گرافیت", hex: "#1c2230" },
  ivory: { name: "عاج مات", hex: "#e9ecf2" },
  emerald: { name: "سبز سمایی", hex: "#22c55e" },
  orange: { name: "نارنجی شعله", hex: "#f97316" },
};

const SIZES_STD: SizeOption[] = [
  { name: "کوچک (۸ سانتی‌متر)", delta: 0 },
  { name: "متوسط (۱۲ سانتی‌متر)", delta: 60_000 },
  { name: "بزرگ (۱۸ سانتی‌متر)", delta: 150_000 },
];

export const products: Product[] = [
  {
    id: "p1",
    slug: "aria-star-commander",
    title: "فرمانده نجومی «آریا»",
    subtitle: "اکشن فیگور کلکسیونی با زره پرچین",
    category: "action-figures",
    collectionIds: ["gamers"],
    price: 685_000,
    oldPrice: 820_000,
    image: images.actionFigure,
    material: "Resin",
    materials: ["Resin", "PLA"],
    colors: [C.violet, C.graphite, C.cyan],
    sizes: SIZES_STD,
    customizable: true,
    inStock: true,
    suitableFor: ["کلکسیونرها", "دکوری اتاق"],
    badge: "پرفروش",
    featured: true,
    productionDays: 5,
    shortDesc: "فرمانده فضایی با زره پرچین و نورپردازی کهکشانی؛ ساخته‌شده با چاپ رزینی دقیق.",
    description:
      "«آریا» یک اکشن فیگور کلکسیونی است که با جزئیات بالا و حالت ایستادهٔ پویا طراحی شده است. زره پرچین، کلاه‌خود چندتکه و اسلحهٔ کمری با چاپ رزینی چندفرایندی ساخته می‌شوند و سپس با دست رنگ‌آمیزی و پولیش می‌شوند. این فیگور برای کلکسیونرها، طرفداران علمی‌تخیلی و دکوری اتاق یا میز کار ایده‌آل است.",
    features: [
      "چاپ رزینی با دقت لایهٔ ۲۵ میکرون",
      "رنگ‌آمیزی و پولیش دستی",
      "پایه مغناطیسی برای نمایش پایدار",
      "قابل سفارشی‌سازی رنگ و پایه",
    ],
    specs: [
      { label: "متریال پیش‌فرض", value: "رزین فوتوپلیمر" },
      { label: "ارتفاع استاندارد", value: "۱۲ سانتی‌متر" },
      { label: "وزن تقریبی", value: "۹۵ گرم" },
      { label: "زمان تولید", value: "۴ تا ۶ روز کاری" },
    ],
    care: "از قرار دادن در معرض تابش مستقیم خورشید و گرما بیش از ۶۰ درجه خودداری کنید. برای پاک کردن از یک پارچهٔ نرم و مرطوب استفاده کنید.",
  },
  {
    id: "p2",
    slug: "tupal-desert-guardian",
    title: "محافظ صحرایی «تپال»",
    subtitle: "فیگور جنگجوی صحرا با سپر دوگانه",
    category: "action-figures",
    collectionIds: ["gamers", "fantasy"],
    price: 540_000,
    image: images.hero,
    material: "PLA",
    materials: ["PLA", "PETG"],
    colors: [C.orange, C.graphite, C.ivory],
    sizes: SIZES_STD,
    customizable: true,
    inStock: true,
    suitableFor: ["کلکسیونرها", "هدیه"],
    featured: true,
    productionDays: 4,
    shortDesc: "جنگجوی صحرا با سپر دوگانه و زره صخره‌ای؛ روحیه‌ای غلیظ از ماجراجویی.",
    description:
      "«تپال» الهام‌گرفته از محافظان راه‌های کاروانی است؛ با سپر دوگانه، زره صخره‌ای و حالتی آمادهٔ نبرد. فیگور با فیلامنت PLA ضد UV چاپ می‌شود و برای دوام در دست‌زدن‌های مکرر مناسب است. یک انتخاب عالی برای کلکسیون و هدیه.",
    features: [
      "طراحی اوریجینال، بدون استفاده از کاراکترهای دارای حق نشر",
      "مقاوم در برابر دست‌زدن",
      "پایهٔ ساده و پایدار",
    ],
    specs: [
      { label: "متریال پیش‌فرض", value: "PLA" },
      { label: "ارتفاع استاندارد", value: "۱۲ سانتی‌متر" },
      { label: "وزن تقریبی", value: "۸۰ گرم" },
      { label: "زمان تولید", value: "۳ تا ۵ روز کاری" },
    ],
    care: "با پارچهٔ مرطوب تمیز کنید و از مواد شویندهٔ تند دور نگه دارید.",
  },
  {
    id: "p3",
    slug: "frooz-crystal-dragon",
    title: "اژدهای کریستالی «فروز»",
    subtitle: "فیگور فانتزی با جلوهٔ شیشه‌ای",
    category: "fantasy",
    collectionIds: ["fantasy"],
    price: 760_000,
    oldPrice: 890_000,
    image: images.fantasyFigure,
    material: "Resin",
    materials: ["Resin"],
    colors: [C.cyan, C.violet, C.emerald],
    sizes: SIZES_STD,
    customizable: true,
    inStock: true,
    suitableFor: ["دکوری", "هدیه خاص"],
    badge: "ویژه",
    featured: true,
    productionDays: 6,
    shortDesc: "اژدهای کوچک کریستالی با بال‌های نیمه‌شفاف و جلوهٔ نورانی؛ قطعه‌ای نمایشی.",
    description:
      "«فروز» اژدهایی فانتزی است که روی یک صخره فرود آمده و بال‌هایش را گسترانده است. چاپ رزینی با رزین شفاف‌شونده، جلوهٔ کریستالی خاصی به آن می‌دهد و در نور، شکست نور زیبایی می‌سازد. این فیگور برای ویترین، میز کار و هدیه‌های خاص ساخته شده است.",
    features: [
      "رزین شفاف‌شونده با جلوهٔ کریستالی",
      "بال‌های نازک و پرجزئیات",
      "قابل سفارشی‌سازی رنگ جلوه",
    ],
    specs: [
      { label: "متریال پیش‌فرض", value: "رزین شفاف" },
      { label: "بازهٔ بال‌ها", value: "۱۶ سانتی‌متر" },
      { label: "وزن تقریبی", value: "۱۱۰ گرم" },
      { label: "زمان تولید", value: "۵ تا ۷ روز کاری" },
    ],
    care: "بال‌ها ظریف هستند؛ از افتادن و فشار خودداری کنید. تمیز کردن با پارچهٔ میکروفایبر.",
  },
  {
    id: "p4",
    slug: "mind-gem-abstract",
    title: "الماس ذهنی",
    subtitle: "مجسمهٔ انتزاعی برای تمرکز و دکوری",
    category: "statues",
    collectionIds: ["desk"],
    price: 320_000,
    image: images.fantasyFigure,
    material: "PLA",
    materials: ["PLA", "Resin"],
    colors: [C.violet, C.cyan, C.ivory],
    sizes: [
      { name: "متوسط", delta: 0 },
      { name: "بزرگ", delta: 90_000 },
    ],
    customizable: false,
    inStock: true,
    suitableFor: ["دکوری میز کار", "هدیه سازمانی"],
    featured: false,
    productionDays: 3,
    shortDesc: "مجسمهٔ انتزاعی هندسی که روی میز، حس تمرکز و آرامش می‌سازد.",
    description:
      "«الماس ذهنی» یک مجسمهٔ انتزاعی با سطوح هندسی چندگانه است که از هر زاویه، فرم متفاوتی نشان می‌دهد. این قطعه برای دکوری میز کار، میز جلسات یا هدیهٔ سازمانی طراحی شده و با خطوط لایه‌ای ظریف، هویت چاپ سه‌بعدی را به نمایش می‌گذارد.",
    features: ["سطوح هندسی چندگانه", "حس تمرکز و آرامش", "سبک و پایدار"],
    specs: [
      { label: "متریال پیش‌فرض", value: "PLA" },
      { label: "ارتفاع", value: "۱۰ سانتی‌متر" },
      { label: "وزن تقریبی", value: "۶۰ گرم" },
      { label: "زمان تولید", value: "۲ تا ۴ روز کاری" },
    ],
    care: "با پارچهٔ نرم پاک کنید. در معرض گرما قرار ندهید.",
  },
  {
    id: "p5",
    slug: "nova-lowpoly-planter",
    title: "گلدان چندوجهی «نووا»",
    subtitle: "گلدان مینیمال با طراحی لویی‌پولی",
    category: "home",
    collectionIds: ["desk"],
    price: 245_000,
    image: images.planter,
    material: "PETG",
    materials: ["PETG", "PLA"],
    colors: [C.graphite, C.violet, C.emerald, C.ivory],
    sizes: [
      { name: "کوچک", delta: 0 },
      { name: "متوسط", delta: 50_000 },
      { name: "بزرگ", delta: 110_000 },
    ],
    customizable: true,
    inStock: true,
    suitableFor: ["لوازم خانه", "دکوری"],
    featured: true,
    productionDays: 2,
    shortDesc: "گلدان مینیمال لویی‌پولی، سبک، ضدآب و مناسب گیاهان کوچک و ساکولنت.",
    description:
      "گلدان «نووا» با طراحی چندوجهی (لویی‌پولی) و دیواره‌های ضخیم، هم زیباست و هم کاربردی. این گلدان از PETG ضدآب ساخته می‌شود و سوراخ تخلیهٔ آب دارد؛ برای ساکولنت‌ها، کاکتوس و گیاهان کوچک آپارتمانی عالی است.",
    features: [
      "ضدآب با سوراخ تخلیه",
      "طراحی لویی‌پولی مدرن",
      "گزینهٔ پایهٔ جمع‌آوری آب",
    ],
    specs: [
      { label: "متریال پیش‌فرض", value: "PETG" },
      { label: "قطر دهانه", value: "۹ سانتی‌متر" },
      { label: "وزن تقریبی", value: "۷۰ گرم" },
      { label: "زمان تولید", value: "۱ تا ۳ روز کاری" },
    ],
    care: "قابل شستشو با آب. از قرار دادن در کنار شوفاژ خودداری کنید.",
  },
  {
    id: "p6",
    slug: "dino-fantasy-planter",
    title: "گلدان دایناسور فانتزی",
    subtitle: "گلدان دکوری با حال و هوای کودکی",
    category: "home",
    collectionIds: ["gifts"],
    price: 210_000,
    image: images.planter,
    material: "PLA",
    materials: ["PLA", "PETG"],
    colors: [C.emerald, C.orange, C.graphite],
    sizes: [
      { name: "متوسط", delta: 0 },
      { name: "بزرگ", delta: 70_000 },
    ],
    customizable: true,
    inStock: false,
    suitableFor: ["هدیه", "اتاق کودک"],
    featured: false,
    productionDays: 3,
    shortDesc: "گلدان دایناسور فانتزی؛ ترکیبی از دکوری و شادی برای اتاق کودک و میز کار.",
    description:
      "این گلدان دایناسور با فرم بامزه و سوراخ کاشت گیاه روی پشت، هم دکوری است و هم کاربردی. انتخابی شاد برای اتاق کودک، میز کار و هدیه. می‌توانید رنگ آن را شخصی کنید.",
    features: ["فرم بامزه و دوست‌داشتنی", "سوراخ تخلیهٔ آب", "قابل سفارشی‌سازی رنگ"],
    specs: [
      { label: "متریال پیش‌فرض", value: "PLA" },
      { label: "ارتفاع", value: "۱۴ سانتی‌متر" },
      { label: "وزن تقریبی", value: "۸۵ گرم" },
      { label: "زمان تولید", value: "۲ تا ۴ روز کاری" },
    ],
    care: "با پارچهٔ مرطوب تمیز کنید. مناسب گیاهان کوچک.",
  },
  {
    id: "p7",
    slug: "dark-castle-dice-tower",
    title: "برج تاس «قلعهٔ تاریک»",
    subtitle: "برج تاس و دکوری برای بازی‌های رومیزی",
    category: "gaming",
    collectionIds: ["gamers"],
    price: 395_000,
    image: images.gaming,
    material: "PLA",
    materials: ["PLA", "PETG"],
    colors: [C.graphite, C.violet, C.orange],
    sizes: [
      { name: "استاندارد", delta: 0 },
      { name: "بزرگ", delta: 80_000 },
    ],
    customizable: true,
    inStock: true,
    suitableFor: ["گیمرها", "بازی رومیزی"],
    badge: "پرفروش",
    featured: true,
    productionDays: 4,
    shortDesc: "برج تاس قلعه‌ای با جزئیات کله‌جمجمه‌ای؛ تاس‌ها را منصفانه و نمایشی می‌ریزد.",
    description:
      "برج تاس «قلعهٔ تاریک» یک قطعهٔ دکوری و کاربردی برای جلسات بازی رومیزی است. تاس‌ها از بالا وارد و پس از برخورد به پله‌های داخلی، از دهانهٔ پایینی به‌صورت تصادفی خارج می‌شوند. طراحی چندتکهٔ آن به‌راحتی جمع می‌شود.",
    features: [
      "پله‌های داخلی برای ریختن منصفانهٔ تاس",
      "طراحی چندتکه و قابل جمع‌شدن",
      "جزئیات گوتیک و دکوری",
    ],
    specs: [
      { label: "متریال پیش‌فرض", value: "PLA" },
      { label: "ارتفاع", value: "۲۰ سانتی‌متر" },
      { label: "وزن تقریبی", value: "۱۵۰ گرم" },
      { label: "زمان تولید", value: "۳ تا ۵ روز کاری" },
    ],
    care: "قابل جداسازی و تمیز کردن با پارچهٔ مرطوب.",
  },
  {
    id: "p8",
    slug: "gamer-headset-stand",
    title: "استند هدست و کنترلر «گیمر»",
    subtitle: "سازمان‌دهندهٔ میز گیم با جایگاه هدست",
    category: "desk",
    collectionIds: ["gamers", "desk"],
    price: 285_000,
    image: images.deskOrganizer,
    material: "PETG",
    materials: ["PETG", "PLA"],
    colors: [C.graphite, C.cyan, C.violet],
    sizes: [{ name: "استاندارد", delta: 0 }],
    customizable: true,
    inStock: true,
    suitableFor: ["گیمرها", "سازمان‌دهی میز"],
    featured: false,
    productionDays: 3,
    shortDesc: "استند هدست با جایگاه قلم و گوشی؛ میز گیم را منظم و حرفه‌ای نگه می‌دارد.",
    description:
      "این استند با پایهٔ پایدار، جایگاه مخصوص هدست و یک جایگاه جانبی برای قلم یا گوشی، میز گیم شما را منظم می‌کند. از PETG مقاوم ساخته شده و می‌توانید رنگ آن را با تم میز خود هماهنگ کنید.",
    features: [
      "پایهٔ پایدار ضدسرخوردن",
      "جایگاه هدست و قلم",
      "قابل هماهنگ‌سازی با رنگ تم",
    ],
    specs: [
      { label: "متریال پیش‌فرض", value: "PETG" },
      { label: "ارتفاع", value: "۲۴ سانتی‌متر" },
      { label: "وزن تقریبی", value: "۱۳۰ گرم" },
      { label: "زمان تولید", value: "۲ تا ۴ روز کاری" },
    ],
    care: "با پارچهٔ مرطوب تمیز کنید. بار بیش از حد روی جایگاه هدست نگذارید.",
  },
  {
    id: "p9",
    slug: "orbit-desk-organizer",
    title: "سازمان‌دهندهٔ میز «اوربیت»",
    subtitle: "نظم و زیبایی برای میز کار",
    category: "desk",
    collectionIds: ["desk"],
    price: 360_000,
    image: images.deskOrganizer,
    material: "PLA",
    materials: ["PLA", "PETG"],
    colors: [C.graphite, C.violet, C.ivory, C.cyan],
    sizes: [
      { name: "کوچک", delta: 0 },
      { name: "متوسط", delta: 70_000 },
    ],
    customizable: true,
    inStock: true,
    suitableFor: ["میز کار", "هدیه سازمانی"],
    featured: true,
    productionDays: 3,
    shortDesc: "سازمان‌دهندهٔ چندکاره با جای قلم، کارت و گوشی؛ میزی منظم و الهام‌بخش.",
    description:
      "سازمان‌دهندهٔ «اوربیت» با جایگاه‌های متعدد برای قلم، کارت ویزیت، گوشی و وسایل کوچک، میز کار شما را مرتب نگه می‌دارد. طراحی مدور آن فضایی مدرن می‌سازد و برای هدیهٔ سازمانی هم مناسب است.",
    features: [
      "جایگاه‌های متعدد و کابلی",
      "طراحی مدور و مدرن",
      "قابل سفارشی‌سازی رنگ و لوگو",
    ],
    specs: [
      { label: "متریال پیش‌فرض", value: "PLA" },
      { label: "ابعاد", value: "۱۶ × ۱۲ سانتی‌متر" },
      { label: "وزن تقریبی", value: "۱۲۰ گرم" },
      { label: "زمان تولید", value: "۲ تا ۴ روز کاری" },
    ],
    care: "با پارچهٔ مرطوب پاک کنید.",
  },
  {
    id: "p10",
    slug: "neo-magnetic-phone-holder",
    title: "هولدر موبایل مگنتی «نئو»",
    subtitle: "استند مگنتی با طراحی اوریگامی",
    category: "gadgets",
    collectionIds: ["desk"],
    price: 165_000,
    image: images.phoneHolder,
    material: "PETG",
    materials: ["PETG", "TPU"],
    colors: [C.graphite, C.cyan, C.violet, C.ivory],
    sizes: [{ name: "استاندارد", delta: 0 }],
    customizable: true,
    inStock: true,
    suitableFor: ["میز کار", "گجت"],
    featured: true,
    productionDays: 2,
    shortDesc: "هولدر مگنتی با هندسهٔ اوریگامی؛ گوشی را محکم و زیبا نگه می‌دارد.",
    description:
      "هولدر مگنتی «نئو» با طراحی هندسی الهام‌گرفته از اوریگامی، گوشی مجهز به چسب مغناطیسی را روی میز نگه می‌دارد. زاویهٔ دید مناسب برای تماس تصویری، خواندن دستور پخت یا تماشا. پایهٔ TPU ضدسرخوردگی دارد.",
    features: [
      "مگنت قوی (سازگار با قاب‌های مگنتی)",
      "پایهٔ ضدسرخوردن TPU",
      "زاویهٔ دید مطلوب",
    ],
    specs: [
      { label: "متریال پیش‌فرض", value: "PETG" },
      { label: "ارتفاع", value: "۸ سانتی‌متر" },
      { label: "وزن تقریبی", value: "۴۵ گرم" },
      { label: "زمان تولید", value: "۱ تا ۳ روز کاری" },
    ],
    care: "بدنه را با پارچهٔ مرطوب تمیز کنید. مگنت را از کارت‌های مغناطیسی دور نگه دارید.",
  },
  {
    id: "p11",
    slug: "collectible-keychain-set",
    title: "ست جاکلیدی کلکسیونی",
    subtitle: "سه جاکلیدی هندسی و جذاب",
    category: "keychain",
    collectionIds: ["gifts"],
    price: 120_000,
    oldPrice: 150_000,
    image: images.keychain,
    material: "PLA",
    materials: ["PLA", "TPU"],
    colors: [C.violet, C.cyan, C.orange, C.graphite],
    sizes: [{ name: "ست ۳ تایی", delta: 0 }],
    customizable: true,
    inStock: true,
    suitableFor: ["هدیه کوچک", "یادگاری"],
    featured: true,
    productionDays: 2,
    shortDesc: "ست جاکلیدی کلکسیونی با طرح‌های هندسی؛ هدیه‌ای کوچک و خاص.",
    description:
      "این ست شامل سه جاکلیدی با طرح‌های هندسی متفاوت است. جنس سبک و مقاوم، با حلقهٔ فلزی استاندارد. می‌توانید نام یا حروف دلخواه را روی آن‌ها حک کنیم تا به‌عنوان یادگاری یا هدیهٔ کوچک استفاده شوند.",
    features: [
      "سه طرح متفاوت در یک ست",
      "حلقهٔ فلزی مقاوم",
      "امکان حک نام دلخواه",
    ],
    specs: [
      { label: "متریال پیش‌فرض", value: "PLA" },
      { label: "تعداد", value: "۳ عدد" },
      { label: "وزن تقریبی", value: "۳۵ گرم" },
      { label: "زمان تولید", value: "۱ تا ۳ روز کاری" },
    ],
    care: "در برابر ضربه مقاوم است؛ با آب قابل شستشو.",
  },
  {
    id: "p12",
    slug: "engraved-name-plaque",
    title: "تابلو نام حک‌شده",
    subtitle: "هدیهٔ شخصی‌سازی‌شده با نام و تاریخ",
    category: "gifts",
    collectionIds: ["gifts"],
    price: 290_000,
    image: images.customGift,
    material: "PLA",
    materials: ["PLA", "Resin"],
    colors: [C.graphite, C.violet, C.ivory],
    sizes: [
      { name: "کوچک", delta: 0 },
      { name: "متوسط", delta: 60_000 },
    ],
    customizable: true,
    inStock: true,
    suitableFor: ["هدیه خاص", "یادگاری", "مناسبت"],
    badge: "شخصی‌سازی",
    featured: true,
    productionDays: 4,
    shortDesc: "تابلو نام با حک دقیق نام، تاریخ یا جملهٔ دلخواه؛ هدیه‌ای ماندگار.",
    description:
      "تابلو نام حک‌شده، هدیه‌ای منحصربه‌فرد برای مناسبت‌های خاص است. نام، تاریخ، جملهٔ کوتاه یا طرح دلخواه شما با دقت روی تابلو حک می‌شود. مناسب تولد، سالگرد، ازدواج و یادبودهای سازمانی.",
    features: [
      "حک دقیق نام، تاریخ یا متن کوتاه",
      "طرح‌های تزئینی قابل انتخاب",
      "پایهٔ نمایشگر همراه",
    ],
    specs: [
      { label: "متریال پیش‌فرض", value: "PLA" },
      { label: "ابعاد متوسط", value: "۲۰ × ۱۰ سانتی‌متر" },
      { label: "وزن تقریبی", value: "۹۰ گرم" },
      { label: "زمان تولید", value: "۳ تا ۵ روز کاری" },
    ],
    care: "با پارچهٔ نرم پاک کنید. از خراش‌دادن سطح حک‌شده خودداری کنید.",
  },
];

export function getProduct(slug: string): Product | undefined {
  return products.find((p) => p.slug === slug);
}

export function getProductById(id: string): Product | undefined {
  return products.find((p) => p.id === id);
}

export function relatedProducts(product: Product, limit = 4): Product[] {
  return products
    .filter((p) => p.id !== product.id && p.category === product.category)
    .concat(products.filter((p) => p.id !== product.id))
    .filter((p, i, arr) => arr.findIndex((x) => x.id === p.id) === i)
    .slice(0, limit);
}
