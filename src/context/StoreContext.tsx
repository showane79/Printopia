import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import type { Product } from "@/data/products";

export type ThemeMode = "dark" | "light";
export type ToastType = "success" | "info" | "error";

export interface Toast {
  id: number;
  message: string;
  type: ToastType;
}

export interface CartOptions {
  material: string;
  color: string;
  size: string;
  engraving?: string;
}

export interface CartItem extends CartOptions {
  key: string;
  productId: string;
  slug: string;
  title: string;
  image: string;
  unitPrice: number;
  qty: number;
}

interface StoreValue {
  theme: ThemeMode;
  toggleTheme: () => void;

  cart: CartItem[];
  cartCount: number;
  cartSubtotal: number;
  addToCart: (product: Product, opts: CartOptions, qty?: number) => void;
  updateQty: (key: string, qty: number) => void;
  removeFromCart: (key: string) => void;
  clearCart: () => void;

  wishlist: string[];
  wishlistCount: number;
  isWishlisted: (id: string) => boolean;
  toggleWishlist: (product: Product) => void;

  recentlyViewed: string[];
  addRecentlyViewed: (id: string) => void;

  cartOpen: boolean;
  setCartOpen: (open: boolean) => void;

  toasts: Toast[];
  pushToast: (message: string, type?: ToastType) => void;
  dismissToast: (id: number) => void;
}

const StoreContext = createContext<StoreValue | null>(null);

const LS = {
  cart: "printopia-cart",
  wishlist: "printopia-wishlist",
  theme: "printopia-theme",
  recent: "printopia-recent",
};

function read<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}

function cartKey(productId: string, opts: CartOptions): string {
  return [productId, opts.material, opts.color, opts.size, opts.engraving || ""].join("|");
}

export function StoreProvider({ children }: { children: ReactNode }) {
  const [theme, setTheme] = useState<ThemeMode>(() =>
    typeof document !== "undefined" && document.documentElement.classList.contains("light")
      ? "light"
      : "dark"
  );
  const [cart, setCart] = useState<CartItem[]>(() => read<CartItem[]>(LS.cart, []));
  const [wishlist, setWishlist] = useState<string[]>(() => read<string[]>(LS.wishlist, []));
  const [recentlyViewed, setRecentlyViewed] = useState<string[]>(() => read<string[]>(LS.recent, []));
  const [cartOpen, setCartOpen] = useState(false);
  const [toasts, setToasts] = useState<Toast[]>([]);
  const toastId = useRef(0);

  // Persist
  useEffect(() => {
    try { localStorage.setItem(LS.cart, JSON.stringify(cart)); } catch {}
  }, [cart]);
  useEffect(() => {
    try { localStorage.setItem(LS.wishlist, JSON.stringify(wishlist)); } catch {}
  }, [wishlist]);
  useEffect(() => {
    try { localStorage.setItem(LS.recent, JSON.stringify(recentlyViewed)); } catch {}
  }, [recentlyViewed]);

  // Apply theme to <html>
  useEffect(() => {
    const root = document.documentElement;
    if (theme === "light") root.classList.add("light");
    else root.classList.remove("light");
    try { localStorage.setItem(LS.theme, theme); } catch {}
  }, [theme]);

  const dismissToast = useCallback((id: number) => {
    setToasts((t) => t.filter((x) => x.id !== id));
  }, []);

  const pushToast = useCallback(
    (message: string, type: ToastType = "success") => {
      const id = ++toastId.current;
      setToasts((t) => [...t, { id, message, type }]);
      window.setTimeout(() => dismissToast(id), 3200);
    },
    [dismissToast]
  );

  const toggleTheme = useCallback(() => {
    setTheme((t) => (t === "dark" ? "light" : "dark"));
  }, []);

  const addToCart = useCallback(
    (product: Product, opts: CartOptions, qty = 1) => {
      const sizeDelta = product.sizes.find((s) => s.name === opts.size)?.delta ?? 0;
      const unitPrice = product.price + sizeDelta;
      const key = cartKey(product.id, opts);
      setCart((prev) => {
        const existing = prev.find((i) => i.key === key);
        if (existing) {
          return prev.map((i) => (i.key === key ? { ...i, qty: i.qty + qty } : i));
        }
        return [
          ...prev,
          {
            key,
            productId: product.id,
            slug: product.slug,
            title: product.title,
            image: product.image,
            unitPrice,
            qty,
            material: opts.material,
            color: opts.color,
            size: opts.size,
            engraving: opts.engraving,
          },
        ];
      });
      pushToast(`${product.title} به سبد اضافه شد`);
    },
    [pushToast]
  );

  const updateQty = useCallback((key: string, qty: number) => {
    setCart((prev) =>
      prev
        .map((i) => (i.key === key ? { ...i, qty: Math.max(1, qty) } : i))
        .filter((i) => i.qty > 0)
    );
  }, []);

  const removeFromCart = useCallback((key: string) => {
    setCart((prev) => prev.filter((i) => i.key !== key));
  }, []);

  const clearCart = useCallback(() => setCart([]), []);

  const isWishlisted = useCallback((id: string) => wishlist.includes(id), [wishlist]);

  const toggleWishlist = useCallback(
    (product: Product) => {
      setWishlist((prev) => {
        if (prev.includes(product.id)) {
          pushToast(`${product.title} از علاقه‌مندی‌ها حذف شد`, "info");
          return prev.filter((x) => x !== product.id);
        }
        pushToast(`${product.title} به علاقه‌مندی‌ها اضافه شد`);
        return [product.id, ...prev];
      });
    },
    [pushToast]
  );

  const addRecentlyViewed = useCallback((id: string) => {
    setRecentlyViewed((prev) => [id, ...prev.filter((x) => x !== id)].slice(0, 8));
  }, []);

  const cartCount = useMemo(() => cart.reduce((n, i) => n + i.qty, 0), [cart]);
  const cartSubtotal = useMemo(
    () => cart.reduce((sum, i) => sum + i.unitPrice * i.qty, 0),
    [cart]
  );

  const value: StoreValue = {
    theme,
    toggleTheme,
    cart,
    cartCount,
    cartSubtotal,
    addToCart,
    updateQty,
    removeFromCart,
    clearCart,
    wishlist,
    wishlistCount: wishlist.length,
    isWishlisted,
    toggleWishlist,
    recentlyViewed,
    addRecentlyViewed,
    cartOpen,
    setCartOpen,
    toasts,
    pushToast,
    dismissToast,
  };

  return <StoreContext.Provider value={value}>{children}</StoreContext.Provider>;
}

// eslint-disable-next-line react-refresh/only-export-components
export function useStore(): StoreValue {
  const ctx = useContext(StoreContext);
  if (!ctx) throw new Error("useStore must be used within StoreProvider");
  return ctx;
}
