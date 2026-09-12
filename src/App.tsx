import { useState, useRef, useEffect, useMemo } from "react";
import type { ReactNode, CSSProperties, ChangeEvent } from "react";
import heroPhoto from "@/imports/aerial-view-of-coastal-resort-with-interconnected-pools-near-mai-khao-beach.png";
import { I18nProvider, useI18n, LOCALE, LANGS, LANG_LABEL } from "@/i18n";
import type { TFunc, Lang } from "@/i18n";
import { BrowserRouter } from "react-router-dom";
import { useParams } from "react-router-dom";
import { Routes, Route, useNavigate } from "react-router-dom";



// ─── API ──────────────────────────────────────────────────────────────────────
const API_URL = (import.meta as any).env?.VITE_API_URL ?? "http://localhost:8000/api";
// avatar — ImageField, тож бекенд віддає шлях/URL до файла (не саме зображення).
// Якщо серіалізатор повертає відносний шлях ("/media/avatars/..."), домальовуємо
// origin бекенду (без "/api"); якщо вже повертає абсолютний URL — лишаємо як є.
const API_ORIGIN = API_URL.replace(/\/api\/?$/, "");
function resolveMediaUrl(path?: string | null): string | null {
  if (!path) return null;
  if (/^https?:\/\//i.test(path) || path.startsWith("blob:")) return path;
  return `${API_ORIGIN}${path.startsWith("/") ? "" : "/"}${path}`;
}

function getCookie(name: string): string | null {
  const match = document.cookie.match(new RegExp("(^|;\\s*)" + name + "=([^;]*)"));
  return match ? decodeURIComponent(match[2]) : null;
}

// Для авторизационных запросов (register/login/logout/profile) — с сессионной
// cookie (credentials: "include") и CSRF-токеном, который Django кладёт в
// cookie "csrftoken" после /auth/csrf/. Публичные GET (тури, довідники) можно
// дергать обычным fetch — они не требуют CSRF.
// Если options.body — FormData (аватар-файл), НЕ ставим Content-Type сами:
// браузер сам подставит "multipart/form-data; boundary=...", иначе загрузка
// файла на бекенд сломается.
async function apiFetch(path: string, options: RequestInit = {}) {
  const csrfToken = getCookie("csrftoken");
  const isFormData = options.body instanceof FormData;
  return fetch(`${API_URL}${path}`, {
    ...options,
    credentials: "include",
    headers: {
      ...(isFormData ? {} : { "Content-Type": "application/json" }),
      ...(csrfToken ? { "X-CSRFToken": csrfToken } : {}),
      ...(options.headers || {}),
    },
  });
}

// ─── Types ────────────────────────────────────────────────────────────────────
type Page = "home" | "tour" | "results" | "filters" | "history";
type Modal = null | "booking" | "profile";

interface User {
  email: string;
  full_name: string;
  phone: string;
  avatar?: string | null; // шлях/URL до файла з ImageField, або null/відсутній
  is_staff: boolean;
}

interface Tour {
  id: number;
  name: string;
  stars: number;
  nights: number;
  country: string;
  meal: string;
  price: string;
  img: string;
  is_hot: boolean;
  departure_city?: string;
  goal_city?: string;
  tour_operator?: string;
  resort?: string;
  departure_date?: string;
  adults_count?: number;
  children?: boolean;
}

interface TourDetail extends Tour {
  description: string;
  photos: string[];
}

interface RefItem {
  id: number | string;
  name: string;
  countryId?: number | string | null;
}

interface BookingHistoryItem {
  id: number;
  tour: Tour | null;
  status: string;
  status_display: string;
  preferred_contact: "viber" | "telegram";
  preferred_date_from: string | null;
  preferred_date_to: string | null;
  adults_count: number;
  children: boolean;
  created_at: string;
}

// ─── Filters ────────────────────────────────────────────────────────────────
interface Filters {
  destination: string;
  countryId: string;
  departureCityId: string;
  goalCityId: string;
  tourOperatorId: string;
  resort: string;
  dateFrom: string;
  dateTo: string;
  starsMin: string;
  meal: string;
  nightsMin: string;
  nightsMax: string;
  priceMin: string;
  priceMax: string;
  currency: string;
  adults: number;
  children: boolean;
  hotOnly: boolean;
}

const EMPTY_FILTERS: Filters = {
  destination: "",
  countryId: "",
  departureCityId: "",
  goalCityId: "",
  tourOperatorId: "",
  resort: "",
  dateFrom: "",
  dateTo: "",
  starsMin: "",
  meal: "",
  nightsMin: "",
  nightsMax: "",
  priceMin: "",
  priceMax: "",
  currency: "",
  adults: 2,
  children: false,
  hotOnly: false,
};

const STAR_OPTIONS = [3, 4, 5];

const CURRENCY_OPTIONS = [
  { symbol: "₴", labelKey: "currency.uah" },
  { symbol: "$", labelKey: "currency.usd" },
  { symbol: "€", labelKey: "currency.eur" },
] as const;

function parsePrice(price: string): number | null {
  const match = price.replace(/\s/g, "").match(/\d+([.,]\d+)?/);
  if (!match) return null;
  return parseFloat(match[0].replace(",", "."));
}

function parseCurrencySymbol(price: string): string | null {
  if (price.includes("₴")) return "₴";
  if (price.includes("€")) return "€";
  if (price.includes("$")) return "$";
  return null;
}

// Додає задану кількість ночей до дати "YYYY-MM-DD" і повертає теж "YYYY-MM-DD".
// Використовується і в пошуку (дата вильоту + ночей → дата вильоту "по"),
// і в заявці на бронювання (дата вильоту + ночі конкретного туру → дата повернення).
function addNights(dateStr: string, nights: number): string {
  if (!dateStr || !nights || nights <= 0) return "";
  const d = new Date(dateStr + "T00:00:00");
  if (isNaN(d.getTime())) return "";
  d.setDate(d.getDate() + nights);
  return d.toISOString().slice(0, 10);
}

interface RefLists {
  countries: RefItem[];
  departureCities: RefItem[];
  goalCities: RefItem[];
  operators: RefItem[];
  resorts: RefItem[];
  mealTypes: RefItem[];
}

function applyFilters(tours: Tour[], f: Filters, refs: RefLists): Tour[] {
  const countryName = refs.countries.find((c) => String(c.id) === f.countryId)?.name;
  const departureCityName = refs.departureCities.find((c) => String(c.id) === f.departureCityId)?.name;
  const goalCityName = refs.goalCities.find((c) => String(c.id) === f.goalCityId)?.name;
  const operatorName = refs.operators.find((c) => String(c.id) === f.tourOperatorId)?.name;

  return tours.filter((t) => {
    if (f.destination) {
      const q = f.destination.toLowerCase();
      if (!t.name.toLowerCase().includes(q) && !t.country.toLowerCase().includes(q)) return false;
    }
    if (countryName && t.country !== countryName) return false;
    if (departureCityName && t.departure_city && t.departure_city !== departureCityName) return false;
    if (goalCityName && t.goal_city && t.goal_city !== goalCityName) return false;
    if (operatorName && t.tour_operator && t.tour_operator !== operatorName) return false;
    if (f.resort && t.resort && t.resort !== f.resort) return false;

    if (f.starsMin && t.stars < Number(f.starsMin)) return false;
    if (f.meal && t.meal !== f.meal) return false;
    if (f.nightsMin && t.nights < Number(f.nightsMin)) return false;
    if (f.nightsMax && t.nights > Number(f.nightsMax)) return false;

    if (f.currency && parseCurrencySymbol(t.price) !== f.currency) return false;

    const price = parsePrice(t.price);
    if (f.priceMin && price != null && price < Number(f.priceMin)) return false;
    if (f.priceMax && price != null && price > Number(f.priceMax)) return false;

    // Дата навмисно НЕ фільтрує тури — це поле збирається лише для того, щоб
    // передати бажану дату вильоту менеджеру разом із заявкою на бронювання.
    // Тур у моделі вже має власну фіксовану departure_date (конкретний виліт),
    // а "Дата" в пошуку — це побажання клієнта, а не критерій відбору.

    if (f.adults !== EMPTY_FILTERS.adults && typeof t.adults_count === "number" && t.adults_count < f.adults) return false;
    if (f.children && t.children === false) return false;
    if (f.hotOnly && !t.is_hot) return false;

    return true;
  });
}

interface Chip {
  id: string;
  label: string;
  onRemove: () => void;
}

// Реальний відгук з бекенду (Review: author_name, rating, text, created_at).
// is_published тут не потрібен — API віддає лише опубліковані відгуки.
interface Review {
  id: number;
  author_name: string;
  author_avatar:string | null;
  rating: number;
  text: string;
  created_at: string;
  tour_name?: string | null; // для закріплених відгуків на головній — з якого туру
}

function formatDate(iso: string, lang: Lang): string {
  try {
    return new Date(iso).toLocaleDateString(LOCALE[lang], { day: "numeric", month: "long", year: "numeric" });
  } catch {
    return iso;
  }
}

function ReviewAvatar({ src, name }: { src: string | null; name: string }) {
  if (src) {
    return (
      <img src={src} alt="" className="rounded-full object-cover flex-shrink-0" style={{ width: 36, height: 36 }} />
    );
  }
  return (
    <div
      className="rounded-full flex items-center justify-center flex-shrink-0 font-semibold text-sm"
      style={{ width: 36, height: 36, background: "#E8F5EF", color: "#00ab00" }}
    >
      {name?.[0]?.toUpperCase() || "?"}
    </div>
  );
}

function buildChips(f: Filters, refs: RefLists, onFiltersChange: (patch: Partial<Filters>) => void, t: TFunc): Chip[] {
  const chips: Chip[] = [];
  const clear = (patch: Partial<Filters>) => onFiltersChange(patch);

  if (f.destination) chips.push({ id: "destination", label: f.destination, onRemove: () => clear({ destination: "" }) });
  if (f.countryId) {
    const name = refs.countries.find((c) => String(c.id) === f.countryId)?.name ?? t("chip.country");
    chips.push({ id: "country", label: name, onRemove: () => clear({ countryId: "" }) });
  }
  if (f.departureCityId) {
    const name = refs.departureCities.find((c) => String(c.id) === f.departureCityId)?.name ?? t("chip.departure");
    chips.push({ id: "departureCity", label: t("chip.departureWith", { name }), onRemove: () => clear({ departureCityId: "" }) });
  }
  if (f.goalCityId) {
    const name = refs.goalCities.find((c) => String(c.id) === f.goalCityId)?.name ?? t("chip.goalCity");
    chips.push({ id: "goalCity", label: name, onRemove: () => clear({ goalCityId: "" }) });
  }
  if (f.tourOperatorId) {
    const name = refs.operators.find((c) => String(c.id) === f.tourOperatorId)?.name ?? t("chip.operator");
    chips.push({ id: "operator", label: name, onRemove: () => clear({ tourOperatorId: "" }) });
  }
  if (f.resort) chips.push({ id: "resort", label: f.resort, onRemove: () => clear({ resort: "" }) });
  if (f.dateFrom || f.dateTo) {
    chips.push({
      id: "dates",
      label: (f.dateFrom && f.dateTo ? `${f.dateFrom} – ${f.dateTo}` : f.dateFrom || f.dateTo) + t("chip.forRequest"),
      onRemove: () => clear({ dateFrom: "", dateTo: "" }),
    });
  }
  if (f.starsMin) chips.push({ id: "stars", label: t("chip.starsAndUp", { n: f.starsMin }), onRemove: () => clear({ starsMin: "" }) });
  if (f.meal) chips.push({ id: "meal", label: f.meal, onRemove: () => clear({ meal: "" }) });
  if (f.nightsMin || f.nightsMax) {
    chips.push({
      id: "nights",
      label: t("chip.nights", { from: f.nightsMin || "0", to: f.nightsMax || "∞" }),
      onRemove: () => clear({ nightsMin: "", nightsMax: "" }),
    });
  }
  if (f.priceMin || f.priceMax) {
    chips.push({
      id: "price",
      label: `${f.priceMin || "0"}–${f.priceMax || "∞"} ${f.currency}`.trim(),
      onRemove: () => clear({ priceMin: "", priceMax: "" }),
    });
  }
  if (f.currency) {
    const option = CURRENCY_OPTIONS.find((c) => c.symbol === f.currency);
    const label = option ? t(option.labelKey) : f.currency;
    chips.push({ id: "currency", label, onRemove: () => clear({ currency: "" }) });
  }
  if (f.adults !== EMPTY_FILTERS.adults) {
    chips.push({ id: "adults", label: t("chip.adults", { n: f.adults }), onRemove: () => clear({ adults: EMPTY_FILTERS.adults }) });
  }
  if (f.children) chips.push({ id: "children", label: t("chip.children"), onRemove: () => clear({ children: false }) });
  if (f.hotOnly) chips.push({ id: "hot", label: t("chip.hot"), onRemove: () => clear({ hotOnly: false }) });

  return chips;
}

// ─── Stars ────────────────────────────────────────────────────────────────────
function Stars({ count, size = 16 }: { count: number; size?: number }) {
  return (
    <div className="flex gap-0.5">
      {Array.from({ length: 5 }).map((_, i) => (
        <svg key={i} width={size} height={size} viewBox="0 0 16 16" fill={i < count ? "#FFB800" : "#E2E4DF"}>
          <path d="M8 1l1.854 3.756L14 5.528l-3 2.924.708 4.128L8 10.5l-3.708 2.08L5 8.452 2 5.528l4.146-.772z" />
        </svg>
      ))}
    </div>
  );
}

// Клікабельні зірки для форми відгуку — на відміну від Stars (лише показ).
function StarPicker({ value, onChange }: { value: number; onChange: (v: number) => void }) {
  const { t } = useI18n();
  return (
    <div className="flex gap-1">
      {[1, 2, 3, 4, 5].map((n) => (
        <button
          key={n}
          type="button"
          onClick={() => onChange(n)}
          aria-label={t("review.starsAria", { n })}
          className="transition-transform hover:scale-110"
        >
          <svg width="26" height="26" viewBox="0 0 16 16" fill={n <= value ? "#FFB800" : "#E2E4DF"}>
            <path d="M8 1l1.854 3.756L14 5.528l-3 2.924.708 4.128L8 10.5l-3.708 2.08L5 8.452 2 5.528l4.146-.772z" />
          </svg>
        </button>
      ))}
    </div>
  );
}

// ─── Small shared form controls ────────────────────────────────────────────────
const fieldInputStyle: CSSProperties = { border: "1px solid #E2E4DF", fontSize: 15, height: 52 };
const fieldInputClass =
  "px-4 rounded-[10px] border text-sm font-medium focus:outline-none focus:ring-2 focus:ring-blue-300 transition-all w-full bg-white";

function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="flex flex-col gap-1.5">
      <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide">{label}</label>
      {children}
    </div>
  );
}

function Stepper({ value, onChange, min = 1, max = 10 }: { value: number; onChange: (v: number) => void; min?: number; max?: number }) {
  return (
    <div className="flex items-center px-3 rounded-[10px] border gap-3" style={{ border: "1px solid #E2E4DF", height: 52 }}>
      <button type="button" onClick={() => onChange(Math.max(min, value - 1))} className="w-8 h-8 rounded-full bg-gray-100 hover:bg-gray-200 flex items-center justify-center text-gray-600 font-bold transition-colors">−</button>
      <span className="flex-1 text-center text-sm font-semibold">{value}</span>
      <button type="button" onClick={() => onChange(Math.min(max, value + 1))} className="w-8 h-8 rounded-full bg-gray-100 hover:bg-gray-200 flex items-center justify-center text-gray-600 font-bold transition-colors">+</button>
    </div>
  );
}

function Checkbox({ checked, onChange, label }: { checked: boolean; onChange: (v: boolean) => void; label: string }) {
  return (
    <label className="flex items-center gap-3 cursor-pointer">
      <div
        onClick={() => onChange(!checked)}
        className="w-5 h-5 rounded flex items-center justify-center transition-colors"
        style={{ border: "2px solid " + (checked ? "#2F6FED" : "#E2E4DF"), background: checked ? "#2F6FED" : "#fff" }}
      >
        {checked && (
          <svg width="10" height="8" viewBox="0 0 10 8" fill="none">
            <path d="M1 4l3 3 5-6" stroke="#fff" strokeWidth="1.8" strokeLinecap="round" />
          </svg>
        )}
      </div>
      <span className="text-sm font-medium">{label}</span>
    </label>
  );
}

// ─── Header ───────────────────────────────────────────────────────────────────

function Header({ onProfile, onOpenFilters, onHistory, user }: {
  onProfile: () => void;
  onOpenFilters: () => void;
  onHistory: () => void;
  user: User | null;
}) {
  const navigate = useNavigate();
  const { t, lang, setLang } = useI18n();
  const [langOpen, setLangOpen] = useState(false);

  return (
    <header style={{ background: "#00ab00" }} className="w-full h-20 flex-shrink-0">
      <div className="max-w-[1200px] mx-auto px-6 h-full flex items-center justify-between">
        <button onClick={() => navigate("/")} className="flex items-center gap-3 group">
          <svg
            width="64"
            height="64"
            viewBox="0 0 64 64"
            xmlns="http://www.w3.org/2000/svg"
            aria-label={t("header.logoAlt")}
          >

            <path
              d="M14 15
                C7 21 5 32 8 42
                C11 52 20 58 32 58
                C44 58 53 52 56 42
                C59 32 57 21 50 15
                L44 20
                C49 25 51 33 48 40
                C46 47 40 51 32 51
                C24 51 18 47 16 40
                C13 33 15 25 20 20
                Z"
              fill="#2F6FED"/>


            <circle cx="13" cy="29" r="2" fill="#F7F8F6"/>
            <circle cx="15" cy="40" r="2" fill="#F7F8F6"/>
            <circle cx="23" cy="51" r="2" fill="#F7F8F6"/>
            <circle cx="41" cy="51" r="2" fill="#F7F8F6"/>
            <circle cx="49" cy="40" r="2" fill="#F7F8F6"/>
            <circle cx="51" cy="29" r="2" fill="#F7F8F6"/>


            <path
              d="M47 24 C49 20 51 17 54 14"
              fill="none"
              stroke="#FFB800"
              stroke-width="2.5"
              stroke-linecap="round"/>


            <path
              d="M54 14
                C48 13 46 8 50 6
                C53 4 56 6 57 9
                C58 5 62 4 64 7
                C66 11 62 14 59 15
                C63 15 65 18 63 21
                C60 24 57 20 56 18
                C56 22 53 24 50 22
                C47 20 49 16 52 15
                Z"
              fill="#FFB800"/>
          </svg>

          <span style={{ fontFamily: "Fraunces, serif", fontWeight: 600, fontSize: 18 }} className="hidden sm:inline text-white leading-tight">
            {t("header.brand")}
          </span>
        </button>

        <nav className="flex items-center gap-3 sm:gap-6">
          <button className="hidden sm:inline text-white/90 hover:text-white text-sm font-medium transition-colors" onClick={onOpenFilters}>
            {t("header.advancedFilter")}
          </button>

          <div className="relative">
            <button onClick={() => setLangOpen(!langOpen)} aria-label={t("header.langAria")} className="flex items-center gap-1 bg-white/10 hover:bg-white/20 text-white text-sm font-medium px-3 py-1.5 rounded-lg transition-colors">
              {LANG_LABEL[lang]}
              <svg width="14" height="14" viewBox="0 0 14 14" fill="currentColor">
                <path d="M3 5l4 4 4-4" stroke="currentColor" strokeWidth="1.5" fill="none" strokeLinecap="round" />
              </svg>
            </button>
            {langOpen && (
              <div className="absolute right-0 top-10 bg-white rounded-xl shadow-lg py-1 z-50 min-w-[80px]">
                {LANGS.map((l) => (
                  <button
                    key={l}
                    onClick={() => { setLang(l); setLangOpen(false); }}
                    className="w-full text-left px-4 py-2 text-sm hover:bg-gray-50 font-medium rounded-tl-xl rounded-tr-xl rounded-bl-xl rounded-br-xl transition-colors"
                    style={{ color: l === lang ? "#2F6FED" : "#1F2A24" }}
                  >
                    {LANG_LABEL[l]}
                  </button>
                ))}
              </div>
            )}
          </div>

          <button onClick={onHistory} className="text-white/80 hover:text-white transition-colors" title={t("header.history")}>
            <svg width="22" height="22" viewBox="0 0 22 22" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round">
              <circle cx="11" cy="11" r="9" />
              <path d="M11 6v5l3 3" />
            </svg>
          </button>

          {user?.full_name && (
            <span className="hidden md:inline-block text-white/80 whitespace-nowrap max-w-[160px] truncate">
              {t("header.welcome")} {user.full_name || t("profile.guest")}
            </span>
          )}

          <button
            onClick={onProfile}
            className="relative flex items-center justify-center transition-colors"
            title={user ? user.full_name || user.email : t("header.loginRegister")}
            style={{ width: 24, height: 24 }}
            >
            {user?.avatar ? (
              <img
              src={resolveMediaUrl(user.avatar) ?? undefined}
              alt=""
              className="rounded-full object-cover"
              style={{ width: 24, height: 24 }}
              />
            ) : (
              <svg width="22" height="22" viewBox="0 0 22 22" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" className="text-white/80 hover:text-white transition-colors">
                <circle cx="11" cy="8" r="4" />
                <path d="M3 20c0-4.4 3.6-8 8-8s8 3.6 8 8" />
              </svg>
            )}
            {user && <span className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full" style={{ background: "#5CEAB2" }} />}
          </button>
        </nav>
      </div>
    </header>
  );
}

// ─── Hero / Short search ────────────────────────────────────────────────────────
function Hero({
  filters,
  onFiltersChange,
  onSearch,
  onOpenFilters,
}: {
  filters: Filters;
  onFiltersChange: (patch: Partial<Filters>) => void;
  onSearch: () => void;
  onOpenFilters: () => void;
}) {
  const { t } = useI18n();
  const today = new Date().toISOString().split("T")[0];
  return (
    <section
      className="relative w-full flex flex-col items-center justify-center px-4" style={{ minHeight: 480, borderRadius: "0 0 20px 20px", overflow: "hidden" }}>
      <img src={heroPhoto} alt="Coastal resort aerial view" className="absolute inset-0 w-full h-full object-cover" />
      <div className="absolute inset-0" style={{ background: "rgba(15,30,20,0.45)" }} />

      <div className="relative z-10 flex flex-col items-center w-full">
        <h1
          style={{ fontFamily: "Fraunces, serif", fontWeight: 700, color: "#fff", textShadow: "0 2px 12px rgba(0,0,0,0.4)" }}
          className="mb-8 text-center leading-tight text-3xl sm:text-4xl md:text-[42px]">
          {t("hero.title")}
        </h1>

        <div className="w-full" style={{ maxWidth: 1040, background: "rgba(255,255,255,0.97)", borderRadius: 20, padding: "28px 32px", boxShadow: "0 8px 40px rgba(0,0,0,0.22)", border: "1px solid #E2E4DF", marginBottom: 20 }}>
          <div className="flex flex-col sm:flex-row gap-4 sm:flex-wrap">
            <div className="flex flex-col gap-1 flex-1 min-w-[180px]">
              <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide">{t("hero.where")}</label>
              <input
                value={filters.destination}
                onChange={(e) => onFiltersChange({ destination: e.target.value.replace(/[0-9]/g, "") })}
                placeholder={t("hero.wherePlaceholder")}
                className="h-14 px-4 rounded-[10px] border text-sm font-medium focus:outline-none focus:ring-2 transition-all"
                style={{ border: "1px solid #E2E4DF", fontSize: 15 }}
              />
            </div>

            <div className="flex flex-col gap-1" style={{ minWidth: 180 }}>
              <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide">
                {t("hero.date")}
              </label>
              <div className="relative">
                <input
                  type="date"
                  min={today}
                  value={filters.dateFrom}
                  onChange={(e) => onFiltersChange({ dateFrom: e.target.value })}
                  className="h-14 px-4 pr-5 rounded-[10px] border text-sm font-medium focus:outline-none focus:ring-2 transition-all w-full appearance-none"
                  style={{ border: "1px solid #E2E4DF", fontSize: 15 }}
                />
              </div>
            </div>

            <div className="flex flex-col gap-1" style={{ minWidth: 160 }}>
              <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide">{t("hero.stars")}</label>
              <select
                value={filters.starsMin}
                onChange={(e) => onFiltersChange({ starsMin: e.target.value })}
                className="h-14 px-4 rounded-[10px] border text-sm font-medium focus:outline-none focus:ring-2 transition-all appearance-none bg-white"
                style={{ border: "1px solid #E2E4DF", fontSize: 15 }}
              >
                <option value="">{t("common.any.pl")}</option>
                {STAR_OPTIONS.map((n) => (
                  <option key={n} value={n}>{n} ★</option>
                ))}
              </select>
            </div>

            <div className="flex flex-col gap-1" style={{ minWidth: 160 }}>
              <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide">{t("hero.people")}</label>
              <Stepper value={filters.adults} onChange={(v) => onFiltersChange({ adults: v })} />
            </div>

            <div className="flex flex-col justify-end">
              <button onClick={onSearch} className="h-14 px-8 rounded-[10px] text-white font-semibold text-base transition-all hover:opacity-90 active:scale-95 w-full sm:w-auto" style={{ background: "#2F6FED", minWidth: 140 }}>
                {t("hero.search")}
              </button>
            </div>
          </div>

          <button onClick={onOpenFilters} className="mt-3 text-sm font-medium transition-opacity hover:opacity-70" style={{ color: "#2F6FED" }}>
            {t("hero.advancedSearch")}
          </button>
        </div>
      </div>
    </section>
  );
}

// ─── Advanced Filter Page ───────────────────────────────────────────────────────
function AdvancedFilterPage({
  filters,
  onFiltersChange,
  onReset,
  onSubmit,
  refs,
}: {
  filters: Filters;
  onFiltersChange: (patch: Partial<Filters>) => void;
  onReset: () => void;
  onSubmit: () => void;
  refs: RefLists;
}) {
  const { t } = useI18n();
  const visibleGoalCities = filters.countryId
    ? refs.goalCities.filter((c) => c.countryId != null && String(c.countryId) === filters.countryId)
    : refs.goalCities;

  const handleCountryChange = (countryId: string) => {
    const currentCity = refs.goalCities.find((c) => String(c.id) === filters.goalCityId);
    const cityStillMatches = !currentCity || currentCity.countryId == null || String(currentCity.countryId) === countryId;
    onFiltersChange({
      countryId,
      ...(cityStillMatches ? {} : { goalCityId: "" }),
    });
  };

  const handleGoalCityChange = (goalCityId: string) => {
    const city = refs.goalCities.find((c) => String(c.id) === goalCityId);
    onFiltersChange({
      goalCityId,
      ...(city?.countryId != null ? { countryId: String(city.countryId) } : {}),
    });
  };

  // "Дата вильоту по" рахуємо автоматично від "Дата вильоту з" + кількість
  // ночей (беремо "Ночей від", а якщо воно не задане — "Ночей до"). Поле
  // залишається звичайним інпутом, тож дату завжди можна поправити вручну.
  const handleDateFromChange = (value: string) => {
    const nights = Number(filters.nightsMin || filters.nightsMax);
    const patch: Partial<Filters> = { dateFrom: value };
    if (value && nights > 0) patch.dateTo = addNights(value, nights);
    onFiltersChange(patch);
  };

  const handleNightsMinChange = (value: string) => {
    const patch: Partial<Filters> = { nightsMin: value };
    const nights = Number(value || filters.nightsMax);
    if (filters.dateFrom && nights > 0) patch.dateTo = addNights(filters.dateFrom, nights);
    onFiltersChange(patch);
  };

  const handleNightsMaxChange = (value: string) => {
    const patch: Partial<Filters> = { nightsMax: value };
    const nights = Number(filters.nightsMin || value);
    if (filters.dateFrom && nights > 0) patch.dateTo = addNights(filters.dateFrom, nights);
    onFiltersChange(patch);
  };
  const today = new Date().toISOString().split("T")[0];

  return (
    <div className="max-w-[1200px] mx-auto px-6 pt-10 pb-16">
      <h1 style={{ fontFamily: "Fraunces, serif", fontSize: 28, fontWeight: 700 }} className="mb-6">
        {t("filters.title")}
      </h1>

      <div className="p-5 sm:p-8" style={{ background: "#fff", border: "1px solid #E2E4DF", borderRadius: 16 }}>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5 mb-5">
          <Field label={t("filters.destination")}>
            <input
              value={filters.destination}
              onChange={(e) => onFiltersChange({ destination: e.target.value })}
              placeholder={t("filters.destinationPlaceholder")}
              className={fieldInputClass}
              style={fieldInputStyle}
            />
          </Field>

          <Field label={t("filters.country")}>
            <select value={filters.countryId} onChange={(e) => handleCountryChange(e.target.value)} className={fieldInputClass + " appearance-none"} style={fieldInputStyle}>
              <option value="">{t("common.any.f")}</option>
              {refs.countries.map((c) => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
          </Field>

          <Field label={t("filters.departureCity")}>
            <select value={filters.departureCityId} onChange={(e) => onFiltersChange({ departureCityId: e.target.value })} className={fieldInputClass + " appearance-none"} style={fieldInputStyle}>
              <option value="">{t("common.any.n")}</option>
              {refs.departureCities.map((c) => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
          </Field>

          <Field label={t("filters.goalCity")}>
            <select value={filters.goalCityId} onChange={(e) => handleGoalCityChange(e.target.value)} className={fieldInputClass + " appearance-none"} style={fieldInputStyle}>
              <option value="">{t("common.any.m")}</option>
              {visibleGoalCities.map((c) => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
          </Field>

          <Field label={t("filters.resort")}>
            <select value={filters.resort} onChange={(e) => onFiltersChange({ resort: e.target.value })} className={fieldInputClass + " appearance-none"} style={fieldInputStyle}>
              <option value="">{t("common.any.f")}</option>
              {refs.resorts.map((r) => (
                <option key={r.id} value={r.name}>{r.name}</option>
              ))}
            </select>
          </Field>

          <Field label={t("filters.operator")}>
            <select value={filters.tourOperatorId} onChange={(e) => onFiltersChange({ tourOperatorId: e.target.value })} className={fieldInputClass + " appearance-none"} style={fieldInputStyle}>
              <option value="">{t("common.any.m")}</option>
              {refs.operators.map((c) => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
          </Field>

          <Field label={t("filters.meal")}>
            <select value={filters.meal} onChange={(e) => onFiltersChange({ meal: e.target.value })} className={fieldInputClass + " appearance-none"} style={fieldInputStyle}>
              <option value="">{t("common.any.n")}</option>
              {refs.mealTypes.map((m) => (
                <option key={m.id} value={m.name}>{m.name}</option>
              ))}
            </select>
          </Field>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-5 mb-6">
          <Field label={t("filters.dateFrom")}>
            <input
                  type="date"
                  min={today}
                  value={filters.dateFrom}
                  onChange={(e) => onFiltersChange({ dateFrom: e.target.value })}
                  className="h-14 px-4 pr-5 rounded-[10px] border text-sm font-medium focus:outline-none focus:ring-2 transition-all w-full appearance-none"
                  style={{ border: "1px solid #E2E4DF", fontSize: 15 }}
                />
          </Field>
          <Field label={t("filters.dateTo")}>
            <input type="date" value={filters.dateTo} onChange={(e) => onFiltersChange({ dateTo: e.target.value })} className={fieldInputClass} style={fieldInputStyle} />
            <span className="text-[11px]" style={{ color: "#66716B" }}>{t("filters.dateToHint")}</span>
          </Field>
          <Field label={t("filters.nightsFrom")}>
            <input type="number" min={1} value={filters.nightsMin} onChange={(e) => handleNightsMinChange(e.target.value)} placeholder="1" className={fieldInputClass} style={fieldInputStyle} />
          </Field>
          <Field label={t("filters.nightsTo")}>
            <input type="number" min={1} value={filters.nightsMax} onChange={(e) => handleNightsMaxChange(e.target.value)} placeholder="14" className={fieldInputClass} style={fieldInputStyle} />
          </Field>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-5 mb-6">
          <Field label={t("filters.priceFrom")}>
            <input type="number" min={0} value={filters.priceMin} onChange={(e) => onFiltersChange({ priceMin: e.target.value })} placeholder="0" className={fieldInputClass} style={fieldInputStyle} />
          </Field>
          <Field label={t("filters.priceTo")}>
            <input type="number" min={0} value={filters.priceMax} onChange={(e) => onFiltersChange({ priceMax: e.target.value })} placeholder="2000" className={fieldInputClass} style={fieldInputStyle} />
          </Field>
          <Field label={t("filters.currency")}>
            <select value={filters.currency} onChange={(e) => onFiltersChange({ currency: e.target.value })} className={fieldInputClass + " appearance-none"} style={fieldInputStyle}>
              <option value="">{t("common.any.f")}</option>
              {CURRENCY_OPTIONS.map((c) => (
                <option key={c.symbol} value={c.symbol}>{t(c.labelKey)}</option>
              ))}
            </select>
          </Field>
          <Field label={t("filters.stars")}>
            <select value={filters.starsMin} onChange={(e) => onFiltersChange({ starsMin: e.target.value })} className={fieldInputClass + " appearance-none"} style={fieldInputStyle}>
              <option value="">{t("common.any.pl")}</option>
              {STAR_OPTIONS.map((n) => (
                <option key={n} value={n}>{t("filters.starsAndUp", { n })}</option>
              ))}
            </select>
          </Field>
          <Field label={t("filters.people")}>
            <Stepper value={filters.adults} onChange={(v) => onFiltersChange({ adults: v })} />
          </Field>
        </div>

        <div className="flex flex-wrap items-center gap-6 mb-8">
          <Checkbox checked={filters.children} onChange={(v) => onFiltersChange({ children: v })} label={t("filters.withChildren")} />
          <Checkbox checked={filters.hotOnly} onChange={(v) => onFiltersChange({ hotOnly: v })} label={t("filters.hotOnly")} />
        </div>

        <div className="flex gap-3">
          <button onClick={onSubmit} className="px-8 rounded-[10px] text-white font-semibold text-base transition-all hover:opacity-90 active:scale-95" style={{ background: "#2F6FED", height: 52 }}>
            {t("filters.submit")}
          </button>
          <button onClick={onReset} className="px-6 rounded-[10px] font-semibold text-sm transition-colors hover:bg-gray-50" style={{ border: "1px solid #E2E4DF", height: 52, color: "#1F2A24" }}>
            {t("filters.reset")}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Tour Card ─────────────────────────────────────────────────────────────────
function TourCard({ tour, onBook, onDetails }: { tour: Tour; onBook: (t: Tour) => void; onDetails: (t: Tour) => void }) {
  const { t } = useI18n();
  return (
    <div
      onClick={() => onDetails(tour)}
      className="flex-shrink-0 cursor-pointer group transition-transform hover:-translate-y-1"
      style={{ width: 282, background: "#fff", borderRadius: 16, border: "1px solid #E2E4DF", boxShadow: "0 4px 16px rgba(31,42,36,0.06)", overflow: "hidden" }}
    >
      <div style={{ height: 190, overflow: "hidden" }}>
        <img src={tour.img} alt={tour.name} className="w-full h-full object-cover transition-transform group-hover:scale-105" />
      </div>
      <div className="p-5">
        <h3 style={{ fontFamily: "Fraunces, serif", fontSize: 18, fontWeight: 700, lineHeight: 1.3 }} className="mb-2 line-clamp-2">{tour.name}</h3>
        <Stars count={tour.stars} />
        <p className="mt-2 text-sm" style={{ color: "#66716B" }}>{t("common.tourMeta", { nights: tour.nights, country: tour.country, meal: tour.meal })}</p>
        <p style={{ fontFamily: "Fraunces, serif", fontSize: 22, fontWeight: 700, color: "#1F7A53" }} className="mt-3">{tour.price}</p>
        <button onClick={(e) => { e.stopPropagation(); onBook(tour); }} className="mt-4 w-full h-12 rounded-[10px] text-white font-semibold text-sm transition-all hover:opacity-90" style={{ background: "#2F6FED" }}>
          {t("common.book")}
        </button>
      </div>
    </div>
  );
}

// ─── Booking History Page ─────────────────────────────────────────────────────
const HISTORY_PAGE_SIZE = 5;

function HistoryPage({ onDetails }: { onDetails: (t: Tour) => void }) {
  const { t, lang } = useI18n();
  const [items, setItems] = useState<BookingHistoryItem[]>([]);
  const [loading, setLoading] = useState(true);

  const [countryFilter, setCountryFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [starsFilter, setStarsFilter] = useState("");
  const [page, setPage] = useState(1);

  useEffect(() => {
    (async () => {
      try {
        const res = await apiFetch("/booking-requests/mine/");
        if (res.ok) setItems(await res.json());
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const countryOptions = useMemo(() => {
    const set = new Set<string>();
    items.forEach((b) => { if (b.tour?.country) set.add(b.tour.country); });
    return Array.from(set).sort();
  }, [items]);

  // Пары (код статуса, готовый лейбл с бека) — код нужен для фильтрации,
  // лейбл берём как есть из status_display, языка тут не касаемся.
  const statusOptions = useMemo(() => {
    const map = new Map<string, string>();
    items.forEach((b) => { if (!map.has(b.status)) map.set(b.status, b.status_display); });
    return Array.from(map.entries()); // [ [code, display], ... ]
  }, [items]);

  const filteredItems = useMemo(() => {
    return items.filter((b) => {
      if (countryFilter && b.tour?.country !== countryFilter) return false;
      if (statusFilter && b.status !== statusFilter) return false;
      if (starsFilter && b.tour?.stars !== Number(starsFilter)) return false;
      return true;
    });
  }, [items, countryFilter, statusFilter, starsFilter]);

  useEffect(() => {
    setPage(1);
  }, [countryFilter, statusFilter, starsFilter, items]);

  const totalPages = Math.max(1, Math.ceil(filteredItems.length / HISTORY_PAGE_SIZE));
  const pageItems = filteredItems.slice((page - 1) * HISTORY_PAGE_SIZE, page * HISTORY_PAGE_SIZE);

  if (loading) {
    return (
      <div className="max-w-[1200px] mx-auto px-6 pt-10 pb-16">
        <p style={{ color: "#66716B" }}>{t("history.loading")}</p>
      </div>
    );
  }

  return (
    <div className="max-w-[1200px] mx-auto px-6 pt-10 pb-16">
      <h1 style={{ fontFamily: "Fraunces, serif", fontSize: 28, fontWeight: 700 }} className="mb-6">
        {t("history.title")}
      </h1>

      {items.length === 0 ? (
        <p style={{ color: "#66716B" }}>{t("history.empty")}</p>
      ) : (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
            <Field label={t("history.filterCountry")}>
              <select value={countryFilter} onChange={(e) => setCountryFilter(e.target.value)} className={fieldInputClass + " appearance-none"} style={fieldInputStyle}>
                <option value="">{t("history.anyCountry")}</option>
                {countryOptions.map((c) => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>
            </Field>

            <Field label={t("history.filterStatus")}>
              <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className={fieldInputClass + " appearance-none"} style={fieldInputStyle}>
                <option value="">{t("history.anyStatus")}</option>
                {statusOptions.map(([code, display]) => (
                  <option key={code} value={code}>{display}</option>
                ))}
              </select>
            </Field>

            <Field label={t("history.filterStars")}>
              <select value={starsFilter} onChange={(e) => setStarsFilter(e.target.value)} className={fieldInputClass + " appearance-none"} style={fieldInputStyle}>
                <option value="">{t("history.anyStars")}</option>
                {STAR_OPTIONS.map((n) => (
                  <option key={n} value={n}>{n} ★</option>
                ))}
              </select>
            </Field>
          </div>

          {filteredItems.length === 0 && <p style={{ color: "#66716B" }}>{t("history.filteredEmpty")}</p>}

          <div className="space-y-4">
            {pageItems.map((b) => (
              <div
                key={b.id}
                onClick={() => b.tour && onDetails(b.tour)}
                className={(b.tour ? "cursor-pointer " : "") + "flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-4"}
                style={{ background: "#fff", border: "1px solid #E2E4DF", borderRadius: 16, padding: 16 }}
              >
                <div className="flex items-center gap-3 sm:contents">
                  {b.tour && (
                    <img src={b.tour.img} alt={b.tour.name} className="w-16 h-16 sm:w-[100px] sm:h-[76px] object-cover rounded-[10px] flex-shrink-0" />
                  )}
                  <div className="flex-1">
                    <p style={{ fontFamily: "Fraunces, serif", fontWeight: 700, fontSize: 16 }}>
                      {b.tour ? b.tour.name : t("history.tourDeleted")}
                    </p>
                    <p className="text-sm" style={{ color: "#66716B" }}>
                      {new Date(b.created_at).toLocaleDateString(LOCALE[lang])} · {b.preferred_contact === "viber" ? "Viber" : "Telegram"}
                    </p>
                  </div>
                </div>
                <span className="self-start sm:self-auto" style={{ fontSize: 12, fontWeight: 600, padding: "4px 10px", borderRadius: 8, background: "#F7F8F6", color: "#1F2A24" }}>
                  {b.status_display}
                </span>
              </div>
            ))}
          </div>

          {totalPages > 1 && (
            <div className="flex items-center justify-center gap-2 mt-10">
              {Array.from({ length: totalPages }, (_, i) => i + 1).map((n) => (
                <button
                  key={n}
                  onClick={() => setPage(n)}
                  className="w-10 h-10 rounded-full text-sm font-semibold transition-all"
                  style={{
                    background: page === n ? "#2F6FED" : "#fff",
                    color: page === n ? "#fff" : "#1F2A24",
                    border: "1px solid " + (page === n ? "#2F6FED" : "#E2E4DF"),
                  }}
                >
                  {n}
                </button>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
}

// ─── Hot Tours ─────────────────────────────────────────────────────────────────
function HotTours({ tours, loading, onBook, onDetails }: { tours: Tour[]; loading: boolean; onBook: (t: Tour) => void; onDetails: (t: Tour) => void }) {
  const { t } = useI18n();
  const rowRef = useRef<HTMLDivElement>(null);
  const scroll = (dir: number) => rowRef.current?.scrollBy({ left: dir * 306, behavior: "smooth" });

  return (
    <section className="max-w-[1200px] mx-auto px-6 mt-14 pb-16">
      <div className="flex items-center justify-between mb-6">
        <h2 style={{ fontFamily: "Fraunces, serif", fontSize: 28, fontWeight: 700 }}>{t("hot.title")}</h2>
        <div className="flex gap-2">
          {["‹", "›"].map((ch, i) => (
            <button key={ch} onClick={() => scroll(i === 0 ? -1 : 1)} className="w-10 h-10 rounded-full flex items-center justify-center text-lg font-bold transition-all hover:bg-gray-100" style={{ border: "1px solid #E2E4DF", color: "#1F2A24" }}>
              {ch}
            </button>
          ))}
        </div>
      </div>
      {loading && <p style={{ color: "#66716B" }}>{t("common.loadingTours")}</p>}
      {!loading && tours.length === 0 && <p style={{ color: "#66716B" }}>{t("hot.empty")}</p>}
      <div ref={rowRef} className="flex gap-6 overflow-x-auto pb-2" style={{ scrollbarWidth: "none" }}>
        {tours.map((t) => (
          <TourCard key={t.id} tour={t} onBook={onBook} onDetails={onDetails} />
        ))}
      </div>
    </section>
  );
}

// ─── About ─────────────────────────────────────────────────────────────────────
function About({ pinnedReviews, pinnedReviewsLoading }: { pinnedReviews: Review[]; pinnedReviewsLoading: boolean }) {
  const { t } = useI18n();
  return (
    <section className="max-w-[1200px] mx-auto px-6 py-16">
      <div className="grid gap-10 md:gap-16 grid-cols-1 md:grid-cols-[1fr_440px]">
        <div>
          <h2 style={{ fontFamily: "Fraunces, serif", fontSize: 28, fontWeight: 700 }} className="mb-6">{t("about.title")}</h2>
          <div className="space-y-4 text-base leading-7" style={{ color: "#1F2A24", lineHeight: "26px" }}>
            <p>{t("about.p1")}</p>
            <p>{t("about.p2")}</p>
            <p>{t("about.p3")}</p>
          </div>
          <a href="https://invite.viber.com/?g2=AQAhZKmWY3FWs1PKlcTVAB%2BQb3duaaxB%2B7RLFCMyfS4NB5iCuwm4i6QGCsD1DRtn" className="inline-flex items-center gap-2 mt-6 font-semibold text-sm transition-opacity hover:opacity-80" style={{ color: "#2F6FED" }}>
            <svg width="18" height="18" viewBox="0 0 18 18" fill="#7360F2">
              <rect width="18" height="18" rx="5" fill="#7360F2" />
              <path d="M9 3C5.7 3 3 5.5 3 8.6c0 1.8.9 3.4 2.3 4.4V15l1.8-1c.6.2 1.2.3 1.9.3 3.3 0 6-2.5 6-5.6S12.3 3 9 3z" fill="white" />
            </svg>
            {t("about.viber")}
          </a>
        </div>
        <div className="space-y-3">
          {pinnedReviewsLoading && <p style={{ color: "#66716B" }}>{t("common.loadingReviews")}</p>}
          {!pinnedReviewsLoading && pinnedReviews.length === 0 && (
            <p style={{ color: "#66716B" }}>{t("about.reviewsEmpty")}</p>
          )}
          {pinnedReviews.map((r) => (
            <div key={r.id} className="p-5 overflow-hidden" style={{ background: "#fff", borderRadius: 12, border: "1px solid #E2E4DF", boxShadow: "0 2px 8px rgba(31,42,36,0.04)" }}>
                <div className="flex items-start justify-between mb-3 gap-2">
                  <div className="flex items-center gap-2.5 min-w-0">
                    <ReviewAvatar src={r.author_avatar} name={r.author_name} />
                    <div className="min-w-0">
                      <p className="font-semibold text-sm break-words">{r.author_name}</p>
                      <p className="text-xs mt-0.5" style={{ color: "#66716B" }}></p>
                    </div>
                  </div>
                  <Stars count={r.rating} size={13} />
                </div>
              <p className="text-sm leading-6 break-words" style={{ color: "#66716B", overflowWrap: "anywhere" }}>{r.text}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

// ─── Footer ───────────────────────────────────────────────────────────────────
function Footer() {
  const { t } = useI18n();
  return (
    <footer style={{ background: "#00ab00" }} className="w-full">
      <div className="max-w-[1200px] mx-auto px-6 py-12">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-8 text-white">
          <div>
            <div className="mt-1  flex flex-col sm:flex-row items-center sm: gap-2 text-xs" style={{ borderBottom: "1px solid rgba(255,255,255,0.2)", color: "rgba(255,255,255,0.6)", padding: 20 }}>
              <svg
                width="64"
                height="64"
                viewBox="0 0 64 64"
                xmlns="http://www.w3.org/2000/svg"
                aria-label={t("header.logoAlt")}
              >

                <path
                  d="M14 15
                    C7 21 5 32 8 42
                    C11 52 20 58 32 58
                    C44 58 53 52 56 42
                    C59 32 57 21 50 15
                    L44 20
                    C49 25 51 33 48 40
                    C46 47 40 51 32 51
                    C24 51 18 47 16 40
                    C13 33 15 25 20 20
                    Z"
                  fill="#2F6FED"/>


                <circle cx="13" cy="29" r="2" fill="#F7F8F6"/>
                <circle cx="15" cy="40" r="2" fill="#F7F8F6"/>
                <circle cx="23" cy="51" r="2" fill="#F7F8F6"/>
                <circle cx="41" cy="51" r="2" fill="#F7F8F6"/>
                <circle cx="49" cy="40" r="2" fill="#F7F8F6"/>
                <circle cx="51" cy="29" r="2" fill="#F7F8F6"/>


                <path
                  d="M47 24 C49 20 51 17 54 14"
                  fill="none"
                  stroke="#FFB800"
                  stroke-width="2.5"
                  stroke-linecap="round"/>


                <path
                  d="M54 14
                    C48 13 46 8 50 6
                    C53 4 56 6 57 9
                    C58 5 62 4 64 7
                    C66 11 62 14 59 15
                    C63 15 65 18 63 21
                    C60 24 57 20 56 18
                    C56 22 53 24 50 22
                    C47 20 49 16 52 15
                    Z"
                  fill="#FFB800"/>
              </svg>
              <span style={{ fontFamily: "Fraunces, serif", fontWeight: 600, fontSize: 16 }}>{t("footer.brand")}</span>
            </div>
            <p className="text-sm leading-6 text-white/70" style = {{paddingTop: 32}}>{t("footer.tagline")}</p>
          </div>
          <div>
            <h4 className="font-semibold mb-4">{t("footer.contacts")}</h4>
            <div className="space-y-2 text-sm text-white/80">
              <a href="tel:+380441234567" className="block hover:text-white transition-colors">+38 (044) 123-45-67</a>
              <a href="tel:+380671234567" className="block hover:text-white transition-colors">+38 (067) 123-45-67</a>
              <a href="mailto:info@touragency.ua" className="block hover:text-white transition-colors">info@touragency.ua</a>
            </div>
          </div>
          <div>
            <h4 className="font-semibold mb-4">{t("footer.social")}</h4>
            <div className="flex gap-3">
              {["Instagram", "Facebook", "Telegram", "Viber"].map((s) => (
                <a key={s} href="#" className="w-9 h-9 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-xs font-bold transition-colors" title={s}>{s[0]}</a>
              ))}
            </div>
          </div>
        </div>
        <div className="mt-8 pt-5 flex items-center justify-between text-xs" style={{ borderTop: "1px solid rgba(255,255,255,0.2)", color: "rgba(255,255,255,0.6)" }}>
          <span>{t("footer.copyright")}</span>
          <span>{t("footer.made")}</span>
        </div>
      </div>
    </footer>
  );
}

// ─── Booking Modal ─────────────────────────────────────────────────────────────
function BookingModal({
  tourId, tourName, tourNights, user, preferredDateFrom, preferredDateTo,
  partyAdults, partyChildren, onClose,
}: {
  tourId: number | null;
  tourName: string;
  tourNights: number | null;
  user: User | null;
  preferredDateFrom: string;
  preferredDateTo: string;
  partyAdults: number;
  partyChildren: boolean;
  onClose: () => void;
}) {
  const { t } = useI18n();
  const [success, setSuccess] = useState(false);
  const [email, setEmail] = useState(user?.email ?? "");
  const [phone, setPhone] = useState(user?.phone ?? "");
  const [name, setName] = useState(user?.full_name ?? "");
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [departureDate, setDepartureDate] = useState(preferredDateFrom || "");
  const today = new Date().toISOString().split("T")[0];

  // Дата повернення рахується автоматично з дати вильоту + кількість ночей
  // САМЕ цього туру (Tour.nights) — це те, що вже "розраховано в турі", тож
  // вручну другу дату вводити не треба. Якщо кількість ночей з якоїсь
  // причини невідома — підстраховуємось раніше введеним preferredDateTo.
  const returnDate = tourNights != null ? addNights(departureDate, tourNights) : preferredDateTo;

  const missingFields = !email.trim() || !phone.trim() || !name.trim();
  const canSubmit = !missingFields && !submitting;
  const [preferredContact, setPreferredContact] = useState<"viber" | "telegram">("telegram");
  const [mouseDownOnOverlay, setMouseDownOnOverlay] = useState(false);

  async function submit() {
    if (!canSubmit) return;
    setSubmitting(true);
    setSubmitError(null);
    try {
      const res = await apiFetch("/booking-requests/", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          tour: tourId,
          tour_name: tourName,
          email, phone, full_name: name,
          preferred_contact: preferredContact,
          preferred_date_from: departureDate || null,
          preferred_date_to: returnDate || null,
          adults_count: partyAdults,
          children: partyChildren,
        }),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      setSuccess(true);
    } catch {
      setSubmitError(t("booking.error"));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto py-8"
      style={{ background: "rgba(15,25,20,0.55)" }}
      onMouseDown={(e) => setMouseDownOnOverlay(e.target === e.currentTarget)}
      onClick={(e) => {
        if (mouseDownOnOverlay && e.target === e.currentTarget) onClose();
      }}
    >
      <img
        src={heroPhoto}
        alt=""
        draggable={false}
        className="absolute inset-0 w-full h-full object-cover pointer-events-none select-none"
        style={{ filter: "blur(4px) brightness(0.35)", transform: "scale(1.05)" }}
      />

      <div className="relative z-10 w-full max-h-[85vh] overflow-y-auto" style={{ maxWidth: 520, background: "#fff", borderRadius: 20, padding: 32, boxShadow: "0 16px 48px rgba(31,42,36,0.18)", margin: "0 16px" }}>
        {!success ? (
          <>
            <div className="flex items-center justify-between mb-6">
              <h2 style={{ fontFamily: "Fraunces, serif", fontSize: 24, fontWeight: 700 }}>{t("booking.title")}</h2>
              <button onClick={onClose} className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-gray-100 text-gray-400 text-xl transition-colors">×</button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">{t("booking.tour")}</label>
                <div className="h-13 px-4 flex items-center rounded-[10px] text-sm font-medium" style={{ background: "#F7F8F6", border: "1px solid #E2E4DF", height: 52 }}>{tourName}</div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">{t("booking.departureDate")}</label>
                  <input
                    type="date"
                    min = {today}
                    value={departureDate}
                    onChange={(e) => setDepartureDate(e.target.value)}
                    className="w-full px-4 rounded-[10px] text-sm font-medium focus:outline-none focus:ring-2 focus:ring-blue-400 transition-all"
                    style={{ border: "1px solid #E2E4DF", height: 52 }}
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">
                    {tourNights != null ? t("booking.returnDateNights", { n: tourNights }) : t("booking.returnDate")}
                  </label>
                  <div className="h-13 px-4 flex items-center rounded-[10px] text-sm font-medium" style={{ background: "#F7F8F6", border: "1px solid #E2E4DF", height: 52 }}>
                    {returnDate || t("booking.pickDeparture")}
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">
                  {t("common.email")} {!email.trim() && <span style={{ color: "#D64545" }}>*</span>}
                </label>
                <input value={email} onChange={e => setEmail(e.target.value)} placeholder={t("booking.emailPlaceholder")} className="w-full h-13 px-4 rounded-[10px] text-sm font-medium focus:outline-none focus:ring-2 focus:ring-blue-400 transition-all" style={{ border: "1px solid #E2E4DF", height: 52 }} />
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">
                  {t("common.phone")} {!phone.trim() && <span style={{ color: "#D64545" }}>*</span>}
                </label>
                <input value={phone} onChange={e => setPhone(e.target.value)} placeholder="+380..." className="w-full px-4 rounded-[10px] text-sm font-medium focus:outline-none focus:ring-2 focus:ring-blue-400 transition-all" style={{ border: "1px solid #E2E4DF", height: 52 }} />
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">
                  {t("common.name")} {!name.trim() && <span style={{ color: "#D64545" }}>*</span>}
                </label>
                <input value={name} onChange={e => setName(e.target.value)} placeholder={t("booking.namePlaceholder")} className="w-full px-4 rounded-[10px] text-sm font-medium focus:outline-none focus:ring-2 focus:ring-blue-400 transition-all" style={{ border: "1px solid #E2E4DF", height: 52 }} />
              </div>
            </div>

            {missingFields && !submitting && (
              <p className="mt-3 text-xs" style={{ color: "#66716B" }}>{t("booking.missingFields")}</p>
            )}
            {submitError && <p className="mt-3 text-sm text-red-500">{submitError}</p>}

            <div className="mt-6">
              <p className="text-sm font-semibold mb-3" style={{ color: "#1F2A24" }}>{t("booking.contactQuestion")}</p>
              <div className="flex gap-2 mb-4">
                {(["viber", "telegram"] as const).map((ch) => (
                  <button
                    key={ch}
                    onClick={() => setPreferredContact(ch)}
                    className="flex-1 h-11 rounded-[10px] text-sm font-semibold transition-all"
                    style={{
                      border: "1px solid " + (preferredContact === ch ? "#2F6FED" : "#E2E4DF"),
                      background: preferredContact === ch ? "#2F6FED" : "#fff",
                      color: preferredContact === ch ? "#fff" : "#1F2A24",
                    }}
                  >
                    {ch === "viber" ? "Viber" : "Telegram"}
                  </button>
                ))}
              </div>

              <button
                disabled={!canSubmit}
                onClick={() => submit()}
                className="w-full h-13 rounded-[10px] text-white font-semibold transition-all hover:opacity-90 disabled:opacity-50"
                style={{ background: "#2F6FED", height: 52 }}
              >
                {submitting ? t("booking.submitting") : t("booking.submit")}
              </button>
            </div>
          </>
        ) : (
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <div className="w-14 h-14 rounded-full flex items-center justify-center mb-6" style={{ background: "#E8F5EF" }}>
              <svg width="28" height="28" viewBox="0 0 28 28" fill="none"><path d="M6 14l5 5 11-10" stroke="#00ab00" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" /></svg>
            </div>
            <h3 style={{ fontFamily: "Fraunces, serif", fontSize: 22, fontWeight: 600, maxWidth: 380 }} className="leading-8 mb-8">{t("booking.successTitle")}</h3>
            <button onClick={onClose} className="w-40 h-10 rounded-[10px] font-semibold text-sm transition-all hover:opacity-90" style={{ background: "#2F6FED", color: "#fff" }}>{t("common.close")}</button>
          </div>
        )}
      </div>
    </div>
  );
}

function PasswordInput({
  label, value, onChange, show, onToggleShow, error,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  show: boolean;
  onToggleShow: () => void;
  error?: boolean;
}) {
  return (
    <div>
      <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">{label}</label>
      <div className="relative">
        <input
          type={show ? "text" : "password"}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="w-full px-4 pr-11 rounded-[10px] text-sm font-medium focus:outline-none focus:ring-2 focus:ring-blue-400 transition-all"
          style={{ border: "1px solid " + (error ? "#D64545" : "#E2E4DF"), height: 52 }}
        />
        <button type="button" onClick={onToggleShow} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors" tabIndex={-1}>
          {show ? (
            <svg width="18" height="18" viewBox="0 0 18 18" fill="none" stroke="currentColor" strokeWidth="1.5">
              <path d="M2 9c1.5-3 4.5-5 7-5s5.5 2 7 5c-1.5 3-4.5 5-7 5s-5.5-2-7-5z" /><circle cx="9" cy="9" r="2" />
            </svg>
          ) : (
            <svg width="18" height="18" viewBox="0 0 18 18" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
              <path d="M2 9c1.5-3 4.5-5 7-5s5.5 2 7 5c-1.5 3-4.5 5-7 5s-5.5-2-7-5z" /><circle cx="9" cy="9" r="2" /><path d="M2 2l14 14" />
            </svg>
          )}
        </button>
      </div>
    </div>
  );
}

// ─── Auth / Profile Modal ───────────────────────────────────────────────────────
function AuthProfileModal({
  user,
  onClose,
  onAuthed,
  onLoggedOut,
}: {
  user: User | null;
  onClose: () => void;
  onAuthed: (u: User) => void;
  onLoggedOut: () => void;
}) {
  const { t } = useI18n();
  const [mode, setMode] = useState<"login" | "register" | "forgot">("login");
  const [resetEmail, setResetEmail] = useState("");
  const [resetSent, setResetSent] = useState(false);
  const [resetSubmitting, setResetSubmitting] = useState(false);
  const [resetError, setResetError] = useState<string | null>(null);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [authError, setAuthError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const [editing, setEditing] = useState(false);
  const [fullName, setFullName] = useState(user?.full_name ?? "");
  const [phone, setPhone] = useState("");
  const [registerPhone, setRegisterPhone] = useState("");
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [avatarPreview, setAvatarPreview] = useState<string | null>(resolveMediaUrl(user?.avatar));
  const [removeAvatar, setRemoveAvatar] = useState(false);
  const avatarInputRef = useRef<HTMLInputElement>(null);
  const [savingProfile, setSavingProfile] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [passwordConfirm, setPasswordConfirm] = useState("");
  const passwordsMismatch = mode === "register" && password && passwordConfirm && password !== passwordConfirm;
  const [showPassword, setShowPassword] = useState(false);
  const [mouseDownOnOverlay, setMouseDownOnOverlay] = useState(false);
  

  useEffect(() => {
    setFullName(user?.full_name ?? "");
    setPhone(user?.phone ?? "");
    setAvatarFile(null);
    setAvatarPreview(resolveMediaUrl(user?.avatar));
    setRemoveAvatar(false);
  }, [user]);

  function handleAvatarChange(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setAvatarFile(file);
    setRemoveAvatar(false);
    setAvatarPreview(URL.createObjectURL(file));
  }

  function handleRemoveAvatar() {
    setAvatarFile(null);
    setRemoveAvatar(true);
    setAvatarPreview(null);
    if (avatarInputRef.current) avatarInputRef.current.value = "";
  }

  async function submitAuth() {
    setSubmitting(true);
    setAuthError(null);
    try {
      const path = mode === "login" ? "/auth/login/" : "/auth/register/";
      const body = mode === "login"
        ? { email, password }
        : { email, password, phone: registerPhone };
      const res = await apiFetch(path, { method: "POST", body: JSON.stringify(body) });
      const data = await res.json();
      if (!res.ok) {
        setAuthError(data.detail || data.email?.[0] || data.password?.[0] || data.non_field_errors?.[0] || t("auth.error"));
        return;
      }
      onAuthed(data);
    } catch {
      setAuthError(t("auth.noConnection"));
    } finally {
      setSubmitting(false);
    }
  }

  async function saveProfile() {
    setSavingProfile(true);
    try {
      let res: Response;
      if (avatarFile) {
        // Є новий файл — шлемо multipart/form-data (apiFetch сам не проставляє
        // Content-Type для FormData, щоб браузер додав правильний boundary).
        const form = new FormData();
        form.append("full_name", fullName);
        form.append("phone", phone);
        form.append("avatar", avatarFile);
        res = await apiFetch("/auth/profile/", { method: "PATCH", body: form });
      } else if (removeAvatar) {
        // Прибираємо аватар — avatar має null=True, тож просто шлемо null.
        res = await apiFetch("/auth/profile/", { method: "PATCH", body: JSON.stringify({ full_name: fullName, phone, avatar: null }) });
      } else {
        res = await apiFetch("/auth/profile/", { method: "PATCH", body: JSON.stringify({ full_name: fullName, phone }) });
      }
      if (res.ok) {
        const updated: User = await res.json();
        onAuthed(updated);
        setAvatarFile(null);
        setRemoveAvatar(false);
        setEditing(false);
      }
    } finally {
      setSavingProfile(false);
    }
  }

  async function logout() {
    await apiFetch("/auth/logout/", { method: "POST" });
    onLoggedOut();
    onClose();
  }

  async function deleteAccount() {
    await apiFetch("/auth/delete/", { method: "DELETE" });
    onLoggedOut();
    onClose();
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto py-8"
      style={{ background: "rgba(15,25,20,0.55)" }}
      onMouseDown={(e) => setMouseDownOnOverlay(e.target === e.currentTarget)}
      onClick={(e) => {
        if (mouseDownOnOverlay && e.target === e.currentTarget) onClose();
      }}
    >
      <img
        src={heroPhoto}
        alt=""
        draggable={false}
        className="absolute inset-0 w-full h-full object-cover pointer-events-none select-none"
        style={{ filter: "blur(4px) brightness(0.35)", transform: "scale(1.05)" }}
      />

      <div className="relative z-10 w-full max-h-[85vh] overflow-y-auto" style={{ maxWidth: 520, background: "#fff", borderRadius: 20, padding: 32, boxShadow: "0 16px 48px rgba(31,42,36,0.18)", margin: "0 16px" }}>
        
        {!user ? (
          mode === "forgot" ? (
            <>
              <div className="flex items-center justify-between mb-6">
                <h2 style={{ fontFamily: "Fraunces, serif", fontSize: 24, fontWeight: 700 }}>{t("auth.forgotPasswordTitle")}</h2>
                <button onClick={onClose} className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-gray-100 text-gray-400 text-xl transition-colors">×</button>
              </div>

              {!resetSent ? (
                <>
                  <p className="text-sm mb-4" style={{ color: "#66716B" }}>{t("auth.forgotPasswordHint")}</p>
                  <div>
                    <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">{t("common.email")}</label>
                    <input
                      value={resetEmail}
                      onChange={(e) => setResetEmail(e.target.value)}
                      placeholder={t("booking.emailPlaceholder")}
                      className="w-full px-4 rounded-[10px] text-sm font-medium focus:outline-none focus:ring-2 focus:ring-blue-400 transition-all"
                      style={{ border: "1px solid #E2E4DF", height: 52 }}
                    />
                  </div>
                  {resetError && <p className="mt-3 text-sm text-red-500">{resetError}</p>}
                  <button
                    onClick={async () => {
                      setResetSubmitting(true);
                      setResetError(null);
                      try {
                        const res = await fetch(`${API_URL}/auth/password-reset/`, {
                          method: "POST",
                          headers: { "Content-Type": "application/json" },
                          body: JSON.stringify({ email: resetEmail }),
                        });
                        if (!res.ok) throw new Error();
                        setResetSent(true);
                      } catch {
                        setResetError(t("auth.noConnection"));
                      } finally {
                        setResetSubmitting(false);
                      }
                    }}
                    disabled={resetSubmitting || !resetEmail.trim()}
                    className="w-full mt-6 rounded-[10px] text-white font-semibold text-base transition-all hover:opacity-90 disabled:opacity-50"
                    style={{ background: "#2F6FED", height: 52 }}
                  >
                    {resetSubmitting ? t("auth.wait") : t("auth.sendResetLink")}
                  </button>
                </>
              ) : (
                <p className="text-sm text-center py-6" style={{ color: "#1F2A24" }}>{t("auth.resetLinkSent")}</p>
              )}

              <p className="text-center text-sm mt-4" style={{ color: "#66716B" }}>
                <button onClick={() => { setMode("login"); setAuthError(null); }} className="font-semibold" style={{ color: "#2F6FED" }}>
                  {t("auth.backToLogin")}
                </button>
              </p>
            </>
          ) :(
          <>
            <div className="flex items-center justify-between mb-6">
              <h2 style={{ fontFamily: "Fraunces, serif", fontSize: 24, fontWeight: 700 }}>
                {mode === "login" ? t("auth.login") : t("auth.register")}
              </h2>
              <button onClick={onClose} className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-gray-100 text-gray-400 text-xl transition-colors">×</button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">{t("common.email")}</label>
                <input value={email} onChange={(e) => setEmail(e.target.value)} placeholder={t("booking.emailPlaceholder")} className="w-full px-4 rounded-[10px] text-sm font-medium focus:outline-none focus:ring-2 focus:ring-blue-400 transition-all" style={{ border: "1px solid #E2E4DF", height: 52 }} />
              </div>
              
              {mode === "register" && (
                <div>
                  <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">{t("common.phone")}</label>
                  <input value={registerPhone} onChange={(e) => setRegisterPhone(e.target.value.replace(/\D/g, ""))} placeholder={t("booking.phonePlaceholder")} className="w-full px-4 rounded-[10px] text-sm font-medium focus:outline-none focus:ring-2 focus:ring-blue-400 transition-all" style={{ border: "1px solid #E2E4DF", height: 52 }} />
                </div>
              )}
              <div>
                <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">{t("auth.password")}</label>
                <div className="relative">
                  <input
                    type={showPassword ? "text" : "password"}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder={t("auth.passwordPlaceholder")}
                    className="w-full px-4 pr-11 rounded-[10px] text-sm font-medium focus:outline-none focus:ring-2 focus:ring-blue-400 transition-all"
                    style={{ border: "1px solid #E2E4DF", height: 52 }}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((v) => !v)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors"
                    tabIndex={-1}
                  >
                    {showPassword ? (
                      <svg width="18" height="18" viewBox="0 0 18 18" fill="none" stroke="currentColor" strokeWidth="1.5">
                        <path d="M2 9c1.5-3 4.5-5 7-5s5.5 2 7 5c-1.5 3-4.5 5-7 5s-5.5-2-7-5z" />
                        <circle cx="9" cy="9" r="2" />
                      </svg>
                    ) : (
                      <svg width="18" height="18" viewBox="0 0 18 18" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
                        <path d="M2 9c1.5-3 4.5-5 7-5s5.5 2 7 5c-1.5 3-4.5 5-7 5s-5.5-2-7-5z" />
                        <circle cx="9" cy="9" r="2" />
                        <path d="M2 2l14 14" />
                      </svg>
                    )}
                  </button>
                </div>
                {mode === "login" && (
                  <p className="text-right text-sm mt-2">
                    <button
                      type="button"
                      onClick={() => { setMode("forgot"); setAuthError(null); setResetSent(false); setResetError(null); }}
                      className="font-medium"
                      style={{ color: "#2F6FED" }}
                    >
                      {t("auth.forgotPassword")}
                    </button>
                  </p>
                )}
              </div>
              {mode === "register" && (
                <div>
                  <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">{t("auth.passwordConfirm")}</label>
                  <input
                    type={showPassword ? "text" : "password"}
                    value={passwordConfirm}
                    onChange={(e) => setPasswordConfirm(e.target.value)}
                    placeholder={t("auth.passwordPlaceholder")}
                    className="w-full px-4 rounded-[10px] text-sm font-medium focus:outline-none focus:ring-2 focus:ring-blue-400 transition-all"
                    style={{ border: "1px solid " + (passwordsMismatch ? "#D64545" : "#E2E4DF"), height: 52 }}
                  />
                  {passwordsMismatch && <p className="mt-1.5 text-xs" style={{ color: "#D64545" }}>{t("auth.passwordMismatch")}</p>}
                </div>
              )}
            </div>

            {authError && <p className="mt-3 text-sm text-red-500">{authError}</p>}

            <button
              onClick={submitAuth}
              disabled={submitting || !email.trim() || !password.trim() || (mode === "register" && (passwordsMismatch || !passwordConfirm))}
              className="w-full mt-6 rounded-[10px] text-white font-semibold text-base transition-all hover:opacity-90 disabled:opacity-50"
              style={{ background: "#2F6FED", height: 52 }}
            >
              {submitting ? t("auth.wait") : mode === "login" ? t("auth.loginBtn") : t("auth.registerBtn")}
            </button>

            <p className="text-center text-sm mt-4" style={{ color: "#66716B" }}>
              {mode === "login" ? (
                <>{t("auth.noAccount")}{" "}
                  <button onClick={() => { setMode("register"); setAuthError(null); }} className="font-semibold" style={{ color: "#2F6FED" }}>{t("auth.registerBtn")}</button>
                </>
              ) : (
                <>{t("auth.haveAccount")}{" "}
                  <button onClick={() => { setMode("login"); setAuthError(null); }} className="font-semibold" style={{ color: "#2F6FED" }}>{t("auth.loginBtn")}</button>
                </>
              )}
            </p>
          </>
        ) ): confirmDelete ? (
          <div className="text-center py-6">
            <div className="w-14 h-14 rounded-full bg-red-50 flex items-center justify-center mx-auto mb-4">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#D64545" strokeWidth="2" strokeLinecap="round"><path d="M12 9v4M12 17h.01M10.3 3.5L2 20h20L13.7 3.5a2 2 0 0 0-3.4 0z" /></svg>
            </div>
            <h3 style={{ fontFamily: "Fraunces, serif", fontSize: 20, fontWeight: 700 }} className="mb-2">{t("profile.deleteTitle")}</h3>
            <p className="text-sm text-gray-500 mb-6">{t("profile.deleteText")}</p>
            <div className="flex gap-3">
              <button onClick={() => setConfirmDelete(false)} className="flex-1 h-12 rounded-[10px] font-semibold text-sm border transition-colors hover:bg-gray-50" style={{ border: "1px solid #E2E4DF" }}>{t("common.cancel")}</button>
              <button onClick={deleteAccount} className="flex-1 h-12 rounded-[10px] font-semibold text-sm text-white transition-opacity hover:opacity-90" style={{ background: "#D64545" }}>{t("profile.deleteConfirm")}</button>
            </div>
          </div>
        ) : (
          <>
            <div className="flex items-center justify-between mb-6">
              <h2 style={{ fontFamily: "Fraunces, serif", fontSize: 24, fontWeight: 700 }}>{t("profile.title")}</h2>
              <button onClick={onClose} className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-gray-100 text-gray-400 text-xl transition-colors">×</button>
            </div>

            <div className="flex flex-col items-center gap-3 mb-6">
              <div className="w-20 h-20 rounded-full flex items-center justify-center overflow-hidden" style={{ background: "#F7F8F6", border: "2px solid #E2E4DF" }}>
                {avatarPreview ? (
                  <img src={avatarPreview} alt="" className="w-full h-full object-cover" />
                ) : (
                  <svg width="34" height="34" viewBox="0 0 48 48" fill="none" stroke="#C5CAC3" strokeWidth="1.5">
                    <circle cx="24" cy="18" r="9" />
                    <path d="M6 44c0-9.9 8.1-18 18-18s18 8.1 18 18" />
                  </svg>
                )}
              </div>

              {editing && (
                <>
                  <input ref={avatarInputRef} type="file" accept="image/*" onChange={handleAvatarChange} className="hidden" />
                  <div className="flex gap-3">
                    <button
                      type="button"
                      onClick={() => avatarInputRef.current?.click()}
                      className="text-xs font-semibold px-3 py-1.5 rounded-full transition-colors hover:bg-gray-50"
                      style={{ border: "1px solid #E2E4DF", color: "#1F2A24" }}
                    >
                      {t("profile.changePhoto")}
                    </button>
                    {avatarPreview && (
                      <button
                        type="button"
                        onClick={handleRemoveAvatar}
                        className="text-xs font-medium transition-opacity hover:opacity-70"
                        style={{ color: "#66716B" }}
                      >
                        {t("profile.removePhoto")}
                      </button>
                    )}
                  </div>
                </>
              )}
            </div>

            <div className="space-y-5 mb-8">
              <div>
                <p className="text-xs font-semibold uppercase tracking-wide mb-1" style={{ color: "#66716B" }}>{t("common.email")}</p>
                <p className="text-base font-semibold">{user.email}</p>
              </div>
              <div>
                <p className="text-xs font-semibold uppercase tracking-wide mb-1" style={{ color: "#66716B" }}>{t("common.name")}</p>
                {editing ? (
                  <input value={fullName} onChange={(e) => setFullName(e.target.value)} placeholder={t("booking.namePlaceholder")} className="w-full px-3 py-2 rounded-[10px] text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-blue-300" style={{ border: "1px solid #E2E4DF" }} />
                ) : (
                  <p className="text-base font-semibold">{user.full_name || t("profile.notSet")}</p>
                )}
              </div>
              <div>
                <p className="text-xs font-semibold uppercase tracking-wide mb-1" style={{ color: "#66716B" }}>{t("common.phone")}</p>
                {editing ? (
                  <input value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="+380..." className="w-full px-3 py-2 rounded-[10px] text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-blue-300" style={{ border: "1px solid #E2E4DF" }} />
                ) : (
                  <p className="text-base font-semibold">{user.phone || t("profile.notSet")}</p>
                )}
              </div>
            </div>

            <div className="flex gap-3 mb-3">
              <button
                onClick={() => (editing ? saveProfile() : setEditing(true))}
                disabled={savingProfile}
                className="flex-1 h-12 rounded-[10px] text-sm font-medium transition-colors hover:bg-gray-50 disabled:opacity-50"
                style={{ border: "1px solid #E2E4DF", color: "#1F2A24" }}
              >
                {savingProfile ? t("profile.saving") : editing ? t("profile.save") : t("profile.edit")}
              </button>
              <button onClick={logout} className="flex-1 h-12 rounded-[10px] text-sm font-medium transition-colors hover:bg-gray-50" style={{ border: "1px solid #E2E4DF", color: "#1F2A24" }}>
                {t("profile.logout")}
              </button>
            </div>
              {user.is_staff && (<a
              
                href={`${API_URL.replace(/\/api\/?$/, "")}/admin/`}
                target="_blank"
                rel="noopener noreferrer"
                className="block text-center w-full h-12 flex items-center justify-center rounded-[10px] text-sm font-medium mb-3 transition-colors hover:bg-gray-50"
                style={{ border: "1px solid #E2E4DF", color: "#1F2A24" }}
              >
                {t("profile.admin")}
              </a>
            )}
            <button onClick={() => setConfirmDelete(true)} className="w-full h-12 rounded-[10px] text-white font-semibold text-sm transition-opacity hover:opacity-90" style={{ background: "#D64545" }}>
              {t("profile.delete")}
            </button>
          </>
        )}
      </div>
    </div>
  );
}


// ─── Reset Password Page ───────────────────────────────────────────────────────

function ResetPasswordPage() {
  const { uid, token } = useParams<{ uid: string; token: string }>();
  const navigate = useNavigate();
  const { t } = useI18n();
  const [newPassword, setNewPassword] = useState("");
  const [newPasswordConfirm, setNewPasswordConfirm] = useState("");
  const [showPw, setShowPw] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  async function submit() {
    setSubmitting(true);
    setError(null);
    try {
      const res = await fetch(`${API_URL}/auth/password-reset/confirm/`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ uid, token, new_password: newPassword, new_password_confirm: newPasswordConfirm }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.token?.[0] || data.uid?.[0] || data.new_password?.[0] || data.new_password_confirm?.[0] || data.detail || t("auth.error"));
        return;
      }
      setSuccess(true);
    } catch {
      setError(t("auth.noConnection"));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="max-w-[480px] mx-auto px-6 py-16">
      <div style={{ background: "#fff", border: "1px solid #E2E4DF", borderRadius: 20, padding: 32 }}>
        <h1 style={{ fontFamily: "Fraunces, serif", fontSize: 24, fontWeight: 700 }} className="mb-6">{t("auth.resetPasswordTitle")}</h1>
        {success ? (
          <>
            <p className="text-sm mb-6" style={{ color: "#1F7A53" }}>{t("profile.passwordChanged")}</p>
            <button onClick={() => navigate("/")} className="w-full h-12 rounded-[10px] text-white font-semibold" style={{ background: "#2F6FED" }}>
              {t("auth.backToLogin")}
            </button>
          </>
        ) : (
          <>
            <div className="space-y-3">
              <PasswordInput label={t("profile.newPassword")} value={newPassword} onChange={setNewPassword} show={showPw} onToggleShow={() => setShowPw((v) => !v)} />
              <PasswordInput
                label={t("profile.newPasswordConfirm")}
                value={newPasswordConfirm}
                onChange={setNewPasswordConfirm}
                show={showPw}
                onToggleShow={() => setShowPw((v) => !v)}
                error={!!newPasswordConfirm && newPassword !== newPasswordConfirm}
              />
            </div>
            {error && <p className="mt-3 text-sm text-red-500">{error}</p>}
            <button
              onClick={submit}
              disabled={submitting || !newPassword || newPassword !== newPasswordConfirm || newPassword.length < 6}
              className="w-full mt-6 h-12 rounded-[10px] text-white font-semibold disabled:opacity-50"
              style={{ background: "#2F6FED" }}
            >
              {submitting ? t("auth.wait") : t("auth.resetPasswordBtn")}
            </button>
          </>
        )}
      </div>
    </div>
  );
}

// ─── Search Results Page ───────────────────────────────────────────────────────
const PAGE_SIZE = 5;

function SearchResultsPage({
  tours,
  loading,
  onBook,
  onDetails,
  chips,
  onOpenFilters,
}: {
  tours: Tour[];
  loading: boolean;
  onBook: (t: Tour) => void;
  onDetails: (t: Tour) => void;
  chips: Chip[];
  onOpenFilters: () => void;
}) {
  const { t } = useI18n();
  const [page, setPage] = useState(1);

  // Якщо змінився результат пошуку (нові фільтри) — скидаємо на першу
  // сторінку, інакше можна опинитись на "сторінці 3", де вже нічого немає.
  useEffect(() => {
    setPage(1);
  }, [tours]);

  const totalPages = Math.max(1, Math.ceil(tours.length / PAGE_SIZE));
  const pageTours = tours.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  return (
    <div className="max-w-[1200px] mx-auto px-6 pt-10 pb-16">
      <div className="flex flex-wrap items-center justify-between gap-4 mb-2">
        <h1 style={{ fontFamily: "Fraunces, serif", fontSize: 28, fontWeight: 700 }}>{t("results.title")}</h1>
        <button
          onClick={onOpenFilters}
          className="text-sm font-medium px-4 py-2 rounded-full transition-colors hover:bg-blue-50"
          style={{ border: "1px solid #2F6FED", color: "#2F6FED" }}
        >
          {t("results.advanced")}
        </button>
      </div>

      {!loading && (
        <p className="text-sm mb-4" style={{ color: "#66716B" }}>{t("results.found", { n: tours.length })}</p>
      )}

      {chips.length > 0 && (
        <div className="flex flex-wrap gap-2 mb-6">
          {chips.map((c) => (
            <button
              key={c.id}
              onClick={c.onRemove}
              className="flex items-center gap-1 text-sm font-medium px-3 py-1.5 rounded-full transition-colors hover:bg-blue-50"
              style={{ border: "1px solid #2F6FED", color: "#2F6FED", height: 32 }}
            >
              {c.label} ×
            </button>
          ))}
        </div>
      )}

      {loading && <p style={{ color: "#66716B" }}>{t("common.loadingTours")}</p>}
      {!loading && tours.length === 0 && <p style={{ color: "#66716B" }}>{t("results.empty")}</p>}

      <div className="space-y-4">
        {pageTours.map((tour) => (
          <div key={tour.id} onClick={() => onDetails(tour)} className="flex flex-col sm:flex-row cursor-pointer hover:shadow-md transition-shadow" style={{ background: "#fff", border: "1px solid #E2E4DF", borderRadius: 16, overflow: "hidden" }}>
            <img src={tour.img} alt={tour.name} className="w-full sm:w-60 h-48 sm:h-[190px] object-cover flex-shrink-0" />
            <div className="flex-1 px-4 sm:px-6 py-4">
              <h3 style={{ fontFamily: "Fraunces, serif", fontSize: 20, fontWeight: 700 }} className="mb-1">{tour.name}</h3>
              <Stars count={tour.stars} />
              <p className="mt-2 text-sm" style={{ color: "#66716B" }}>{t("common.tourMeta", { nights: tour.nights, country: tour.country, meal: tour.meal })}</p>
              <p style={{ fontFamily: "Fraunces, serif", fontSize: 22, fontWeight: 700, color: "#1F7A53" }} className="mt-3">{tour.price}</p>
            </div>
            <div className="flex-shrink-0 px-4 sm:px-6 py-3 sm:py-0 flex items-center justify-center w-full sm:w-auto">
              <button onClick={(e) => { e.stopPropagation(); onBook(tour); }} className="w-full sm:w-36 h-12 rounded-[10px] text-white font-semibold text-sm transition-all hover:opacity-90" style={{ background: "#2F6FED" }}>{t("common.book")}</button>
            </div>
          </div>
        ))}
      </div>
      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-2 mt-10">
          {Array.from({ length: totalPages }, (_, i) => i + 1).map((n) => (
            <button
              key={n}
              onClick={() => setPage(n)}
              className="w-10 h-10 rounded-full text-sm font-semibold transition-all"
              style={{
                background: page === n ? "#2F6FED" : "#fff",
                color: page === n ? "#fff" : "#1F2A24",
                border: "1px solid " + (page === n ? "#2F6FED" : "#E2E4DF"),
              }}
            >
              {n}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
// ─── Tour Details Page ─────────────────────────────────────────────────────────

function TourDetailsPage({
  onBook,
  user,
  onRequireAuth,
}: {
  onBook: (t: Tour) => void;
  user: User | null;
  onRequireAuth: () => void;
}) {
  const { id } = useParams<{ id: string }>();
  const tourId = id ? Number(id) : null;
  const { t, lang } = useI18n();
  const [detail, setDetail] = useState<TourDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeImg, setActiveImg] = useState(0);

  const [reviews, setReviews] = useState<Review[]>([]);
  const [reviewsLoading, setReviewsLoading] = useState(true);
  const reviewsRowRef = useRef<HTMLDivElement>(null);
  const scrollReviews = (dir: number) => reviewsRowRef.current?.scrollBy({ left: dir * 344, behavior: "smooth" });

  const [reviewRating, setReviewRating] = useState(5);
  const [reviewText, setReviewText] = useState("");
  const [submittingReview, setSubmittingReview] = useState(false);
  const [reviewError, setReviewError] = useState<string | null>(null);
  const [reviewSubmitted, setReviewSubmitted] = useState(false);

  useEffect(() => {
    if (tourId == null) return;
    let cancelled = false;
    setLoading(true);
    setActiveImg(0);
    (async () => {
      try {
        const res = await fetch(`${API_URL}/tours/${tourId}/`);
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const data: TourDetail = await res.json();
        if (!cancelled) setDetail(data);
      } catch {
        if (!cancelled) setDetail(null);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [tourId]);

  // Відгуки й стан форми — окремо від деталей туру, і скидаються при
  // переході на інший тур.
  useEffect(() => {
    setReviewRating(5);
    setReviewText("");
    setReviewError(null);
    setReviewSubmitted(false);
    if (tourId == null) return;
    let cancelled = false;
    setReviewsLoading(true);
    (async () => {
      try {
        const res = await fetch(`${API_URL}/tours/${tourId}/reviews/`);
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const data = await res.json();
        if (!cancelled) setReviews(Array.isArray(data) ? data : data.results ?? []);
      } catch {
        if (!cancelled) setReviews([]);
      } finally {
        if (!cancelled) setReviewsLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [tourId]);

  async function submitReview() {
    if (!reviewText.trim() || tourId == null) return;
    setSubmittingReview(true);
    setReviewError(null);
    try {
      const res = await apiFetch(`/tours/${tourId}/reviews/`, {
        method: "POST",
        body: JSON.stringify({ rating: reviewRating, text: reviewText.trim() }),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      setReviewSubmitted(true);
      setReviewText("");
    } catch {
      setReviewError(t("review.error"));
    } finally {
      setSubmittingReview(false);
    }
  }

  if (loading) return <div className="max-w-[1200px] mx-auto px-4 sm:px-6 pt-6 sm:pt-10 pb-16"><p style={{ color: "#66716B" }}>{t("tour.loading")}</p></div>;
  if (!detail) return <div className="max-w-[1200px] mx-auto px-4 sm:px-6 pt-6 sm:pt-10 pb-16"><p style={{ color: "#66716B" }}>{t("tour.notFound")}</p></div>;

const images = detail.photos.length > 0 ? detail.photos : [detail.img];

return (
  <div className="max-w-[1200px] mx-auto px-4 sm:px-6 pt-6 sm:pt-10 pb-16">
    {/* Адаптивная сетка: 1 колонка на мобилках, 2 колонки на экранах lg+ */}
    <div className="grid grid-cols-1 lg:grid-cols-[1fr_400px] gap-6 lg:gap-10 mb-10 sm:mb-14">
      <div>
        {/* Главная картинка с адаптивной высотой */}
        <div className="relative rounded-2xl overflow-hidden h-[240px] xs:h-[280px] sm:h-[340px] md:h-[380px]">
          <img src={images[activeImg]} alt={detail.name} className="w-full h-full object-cover" />
          {images.length > 1 && (
            <>
              <button onClick={() => setActiveImg((activeImg - 1 + images.length) % images.length)} className="absolute left-3 sm:left-4 top-1/2 -translate-y-1/2 w-9 h-9 sm:w-10 sm:h-10 rounded-full bg-white/80 hover:bg-white flex items-center justify-center text-lg font-bold transition-all shadow-md">‹</button>
              <button onClick={() => setActiveImg((activeImg + 1) % images.length)} className="absolute right-3 sm:right-4 top-1/2 -translate-y-1/2 w-9 h-9 sm:w-10 sm:h-10 rounded-full bg-white/80 hover:bg-white flex items-center justify-center text-lg font-bold transition-all shadow-md">›</button>
            </>
          )}
        </div>

        {/* Миниатюры с горизонтальным скроллом */}
        {images.length > 1 && (
          <div className="flex gap-2 mt-3 overflow-x-auto pb-2 scrollbar-none">
            {images.map((img, i) => (
              <img
                key={i}
                src={img}
                alt=""
                onClick={() => setActiveImg(i)}
                className="rounded-xl object-cover cursor-pointer transition-all shrink-0 w-16 h-14 sm:w-[72px] sm:h-16"
                style={{
                  border: i === activeImg ? "2px solid #2F6FED" : "2px solid transparent",
                  opacity: i === activeImg ? 1 : 0.7
                }}
              />
            ))}
          </div>
        )}
      </div>

      {/* Карточка отеля с ценой и бронированием */}
      <div className="p-5 sm:p-8" style={{ background: "#fff", border: "1px solid #E2E4DF", borderRadius: 16 }}>
        <h1 className="text-xl sm:text-2xl lg:text-[28px]" style={{ fontFamily: "Fraunces, serif", fontWeight: 700, lineHeight: 1.2 }}>{detail.name}</h1>
        <div className="mt-3"><Stars count={detail.stars} size={18} /></div>
        <div className="mt-5 space-y-2 text-sm sm:text-base" style={{ color: "#66716B" }}>
          <p>📍 {detail.country}</p>
          <p>🌙 {t("tour.nights", { n: detail.nights })}</p>
          <p>🍽 {detail.meal}</p>
        </div>
        <p className="mt-5 sm:mt-6 text-2xl sm:text-3xl" style={{ fontFamily: "Fraunces, serif", fontWeight: 700, color: "#1F7A53" }}>{detail.price}</p>
        <button onClick={() => onBook(detail)} className="w-full mt-5 sm:mt-6 rounded-[10px] text-white font-semibold text-base transition-all hover:opacity-90" style={{ background: "#2F6FED", height: 56 }}>{t("common.book")}</button>
      </div>
    </div>

    {/* Описание тура */}
    <div className="p-5 sm:p-8 md:p-10 mb-8 sm:mb-12" style={{ background: "#fff", border: "1px solid #E2E4DF", borderRadius: 16 }}>
      <h2 className="text-xl sm:text-2xl mb-4 sm:mb-5" style={{ fontFamily: "Fraunces, serif", fontWeight: 700 }}>{t("tour.descTitle")}</h2>
      <div className="space-y-4 text-sm sm:text-base leading-relaxed whitespace-pre-line" style={{ color: "#1F2A24", maxWidth: 1000 }}>
        {detail.description || t("tour.descEmpty")}
      </div>
    </div>

    {/* Заголовок отзывов и кнопки переключения */}
    <div className="flex items-center justify-between gap-4 mb-6">
      <h2 className="text-xl sm:text-2xl" style={{ fontFamily: "Fraunces, serif", fontWeight: 700 }}>{t("tour.reviews")}</h2>
      <div className="flex gap-2">
        {["‹", "›"].map((ch, i) => (
          <button key={ch} onClick={() => scrollReviews(i === 0 ? -1 : 1)} className="w-9 h-9 sm:w-10 sm:h-10 rounded-full flex items-center justify-center text-lg font-bold transition-all hover:bg-gray-100" style={{ border: "1px solid #E2E4DF", color: "#1F2A24" }}>
            {ch}
          </button>
        ))}
      </div>
    </div>

    {reviewsLoading && <p style={{ color: "#66716B" }} className="mb-6">{t("common.loadingReviews")}</p>}
    {!reviewsLoading && reviews.length === 0 && <p style={{ color: "#66716B" }} className="mb-6">{t("tour.reviewsEmpty")}</p>}

    {/* Список отзывов */}
    {reviews.length > 0 && (
      <div ref={reviewsRowRef} className="flex gap-4 sm:gap-6 overflow-x-auto pb-2 mb-8" style={{ scrollbarWidth: "none" }}>
        {reviews.map((r) => (
          <div key={r.id} className="flex-shrink-0 w-[270px] sm:w-[320px] p-4 sm:p-6" style={{ background: "#fff", border: "1px solid #E2E4DF", borderRadius: 14, overflow: "hidden" }}>
            <div className="flex items-start justify-between mb-3 gap-2">
              <div className="flex items-center gap-2 min-w-0">
                    <ReviewAvatar src={r.author_avatar} name={r.author_name} />
                    <div className="min-w-0">
                      <p className="font-semibold text-sm break-words">{r.author_name}</p>
                      <p className="text-xs mt-0.5" style={{ color: "#66716B" }}></p>
                    </div>
                    
              </div>
              
              <Stars count={r.rating} size={13} />
            </div>
            
            <p className="text-sm leading-6 break-words" style={{ color: "#66716B", overflowWrap: "anywhere" }}>{r.text}</p>
            <p className="text-xs mt-0.5" style={{ color: "#66716B" }}>{formatDate(r.created_at, lang)}</p>
          </div>
        ))}
      </div>
    )}

    {/* Форма отзыва */}
    <div className="p-5 sm:p-8" style={{ background: "#fff", border: "1px solid #E2E4DF", borderRadius: 16 }}>
      <h3 className="text-lg sm:text-xl mb-4" style={{ fontFamily: "Fraunces, serif", fontWeight: 700 }}>{t("review.formTitle")}</h3>

      {!user ? (
        <div className="flex flex-wrap items-center gap-2">
          <p className="text-sm" style={{ color: "#66716B" }}>{t("review.needAuth")}</p>
          <button onClick={onRequireAuth} className="text-sm font-semibold transition-opacity hover:opacity-70" style={{ color: "#2F6FED" }}>{t("auth.loginBtn")}</button>
        </div>
      ) : reviewSubmitted ? (
        <p className="text-sm" style={{ color: "#1F7A53" }}>{t("review.thanks")}</p>
      ) : (
        <div className="space-y-4" style={{ maxWidth: 560 }}>
          <div>
            <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">{t("review.rating")}</label>
            <StarPicker value={reviewRating} onChange={setReviewRating} />
          </div>
          <div>
            <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">{t("review.yourReview")}</label>
            <textarea
              value={reviewText}
              onChange={(e) => setReviewText(e.target.value)}
              rows={4}
              placeholder={t("review.placeholder")}
              className="w-full px-4 py-3 rounded-[10px] text-sm font-medium focus:outline-none focus:ring-2 focus:ring-blue-300 transition-all"
              style={{ border: "1px solid #E2E4DF" }}
            />
          </div>
          {reviewError && <p className="text-sm text-red-500">{reviewError}</p>}
          <button
            disabled={submittingReview || !reviewText.trim()}
            onClick={submitReview}
            className="w-full sm:w-auto px-6 rounded-[10px] text-white font-semibold text-sm transition-all hover:opacity-90 disabled:opacity-50"
            style={{ background: "#2F6FED", height: 48 }}
          >
            {submittingReview ? t("review.submitting") : t("review.submit")}
          </button>
        </div>
      )}
    </div>
  </div>
);
}

// ─── App ───────────────────────────────────────────────────────────────────────
// Провайдер мови огортає весь застосунок, щоб будь-який компонент
// нижче міг узяти t()/lang через useI18n().

export default function AppContent() {
  const { t, lang } = useI18n();
  const navigate = useNavigate();

  const [modal, setModal] = useState<Modal>(null);
  const [selectedTour, setSelectedTour] = useState<Tour | null>(null);

  const [tours, setTours] = useState<Tour[]>([]);
  const [toursLoading, setToursLoading] = useState(true);
  const [toursError, setToursError] = useState<string | null>(null);

  const [filters, setFiltersState] = useState<Filters>(EMPTY_FILTERS);
  const setFilters = (patch: Partial<Filters>) => setFiltersState((prev) => ({ ...prev, ...patch }));

  const [countries, setCountries] = useState<RefItem[]>([]);
  const [departureCities, setDepartureCities] = useState<RefItem[]>([]);
  const [goalCities, setGoalCities] = useState<RefItem[]>([]);
  const [operators, setOperators] = useState<RefItem[]>([]);
  const [resorts, setResorts] = useState<RefItem[]>([]);
  const [mealTypes, setMealTypes] = useState<RefItem[]>([]);

  const [pinnedReviews, setPinnedReviews] = useState<Review[]>([]);
  const [pinnedReviewsLoading, setPinnedReviewsLoading] = useState(true);

  const [user, setUser] = useState<User | null>(null);
  const [userLoading, setUserLoading] = useState(true);
  const [pendingBooking, setPendingBooking] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        await apiFetch("/auth/csrf/");
        const res = await apiFetch("/auth/me/");
        if (res.ok && !cancelled) setUser(await res.json());
      } catch {
        // гість / бек недоступний
      } finally {
        if (!cancelled) setUserLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, []);

  const handleAuthed = (u: User) => {
    setUser(u);
    if (pendingBooking) {
      setPendingBooking(false);
      setModal("booking");
    }
  };

  const handleLoggedOut = () => setUser(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch(`${API_URL}/tours/`);
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const data: Tour[] = await res.json();
        if (!cancelled) setTours(data);
      } catch {
        if (!cancelled) setToursError(t("app.toursError"));
      } finally {
        if (!cancelled) setToursLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, []);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch(`${API_URL}/reviews/pinned/`);
        if (!res.ok) throw new Error(String(res.status));
        const data = await res.json();
        if (!cancelled) setPinnedReviews(Array.isArray(data) ? data : data.results ?? []);
      } catch {
        if (!cancelled) setPinnedReviews([]);
      } finally {
        if (!cancelled) setPinnedReviewsLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, []);

  useEffect(() => {
    const load = async (url: string, setter: (v: RefItem[]) => void) => {
      try {
        const res = await fetch(url);
        if (!res.ok) throw new Error(String(res.status));
        const data = await res.json();
        const list: any[] = Array.isArray(data) ? data : data.results ?? [];
        setter(list.map((item) => ({ id: item.id, name: item.name, countryId: item.country ?? null })));
      } catch {
        setter([]);
      }
    };
    load(`${API_URL}/countries/`, setCountries);
    load(`${API_URL}/departure-cities/`, setDepartureCities);
    load(`${API_URL}/goal-cities/`, setGoalCities);
    load(`${API_URL}/tour-operators/`, setOperators);
    load(`${API_URL}/resorts/`, setResorts);

    (async () => {
      try {
        const res = await fetch(`${API_URL}/meal-types/`);
        if (!res.ok) throw new Error(String(res.status));
        const data: { value: string; label: string }[] = await res.json();
        setMealTypes(data.map((m) => ({ id: m.value, name: m.label })));
      } catch {
        setMealTypes([]);
      }
    })();
  }, []);

  const refs: RefLists = { countries, departureCities, goalCities, operators, resorts, mealTypes };

  const filteredTours = useMemo(() => applyFilters(tours, filters, refs), [tours, filters, countries, departureCities, goalCities, operators]);
  const chips = useMemo(() => buildChips(filters, refs, setFilters, t), [filters, countries, departureCities, goalCities, operators, lang]);

  const hotTours = tours.filter((t) => t.is_hot);

  const openBooking = (tour: Tour) => {
    setSelectedTour(tour);
    if (!user) {
      setPendingBooking(true);
      setModal("profile");
      return;
    }
    setModal("booking");
  };

  const openHistory = () => {
    if (!user) {
      setModal("profile");
      return;
    }
    navigate("/history");
  };

  const openDetails = (tour: Tour) => {
    setSelectedTour(tour);
    navigate(`/tour/${tour.id}`);
  };

  const openProfile = () => {
    setPendingBooking(false);
    setModal("profile");
  };

  const openFilters = () => navigate("/filters");
  const runSearch = () => navigate("/results");

  return (
    <div className="min-h-full flex flex-col" style={{ background: "#F7F8F6" }}>
      <Header onProfile={openProfile} onOpenFilters={openFilters} onHistory={openHistory} user={user} />

      {toursError && (
        <div className="max-w-[1200px] mx-auto px-6 mt-4 w-full">
          <div style={{ background: "#FDECEC", border: "1px solid #F3B4B4", color: "#8A2E2E", borderRadius: 10, padding: "10px 16px", fontSize: 14 }}>{toursError}</div>
        </div>
      )}

      <main className="flex-1">
        <Routes>
          <Route
            path="/"
            element={
              <>
                <Hero filters={filters} onFiltersChange={setFilters} onSearch={runSearch} onOpenFilters={openFilters} />
                <HotTours tours={hotTours} loading={toursLoading} onBook={openBooking} onDetails={openDetails} />
                <About pinnedReviews={pinnedReviews} pinnedReviewsLoading={pinnedReviewsLoading} />
              </>
            }
          />
          <Route path="/tour/:id" element={<TourDetailsPage onBook={openBooking} user={user} onRequireAuth={openProfile} />} />
          <Route
            path="/results"
            element={<SearchResultsPage tours={filteredTours} loading={toursLoading} onBook={openBooking} onDetails={openDetails} chips={chips} onOpenFilters={openFilters} />}
          />
          <Route
            path="/filters"
            element={<AdvancedFilterPage filters={filters} onFiltersChange={setFilters} onReset={() => setFiltersState(EMPTY_FILTERS)} onSubmit={runSearch} refs={refs} />}
          />
          <Route path="/history" element={<HistoryPage onDetails={openDetails} />} />
        </Routes>
      </main>

      <Footer />
      {modal === "booking" && (
        <BookingModal
          tourId={selectedTour?.id ?? null}
          tourName={selectedTour?.name ?? ""}
          tourNights={selectedTour?.nights ?? null}
          user={user}
          preferredDateFrom={filters.dateFrom}
          preferredDateTo={filters.dateTo}
          partyAdults={filters.adults}
          partyChildren={filters.children}
          onClose={() => setModal(null)}
        />
      )}
      {modal === "profile" && (
        <AuthProfileModal
          user={user}
          onClose={() => { setModal(null); setPendingBooking(false); }}
          onAuthed={handleAuthed}
          onLoggedOut={handleLoggedOut}
        />
      )}
    </div>
  );
}