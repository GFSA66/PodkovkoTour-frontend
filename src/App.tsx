import { useState, useRef, useEffect, useMemo } from "react";
import type { ReactNode, CSSProperties } from "react";
import heroPhoto from "@/imports/aerial-view-of-coastal-resort-with-interconnected-pools-near-mai-khao-beach.png";

// ─── API ──────────────────────────────────────────────────────────────────────
const API_URL = (import.meta as any).env?.VITE_API_URL ?? "http://localhost:8000/api";

function getCookie(name: string): string | null {
  const match = document.cookie.match(new RegExp("(^|;\\s*)" + name + "=([^;]*)"));
  return match ? decodeURIComponent(match[2]) : null;
}

// Для авторизационных запросов (register/login/logout/profile) — с сессионной
// cookie (credentials: "include") и CSRF-токеном, который Django кладёт в
// cookie "csrftoken" после /auth/csrf/. Публичные GET (тури, довідники) можно
// дергать обычным fetch — они не требуют CSRF.
async function apiFetch(path: string, options: RequestInit = {}) {
  const csrfToken = getCookie("csrftoken");
  return fetch(`${API_URL}${path}`, {
    ...options,
    credentials: "include",
    headers: {
      "Content-Type": "application/json",
      ...(csrfToken ? { "X-CSRFToken": csrfToken } : {}),
      ...(options.headers || {}),
    },
  });
}

// ─── Types ────────────────────────────────────────────────────────────────────
type Page = "home" | "tour" | "results" | "filters";
type Modal = null | "booking" | "profile";

interface User {
  email: string;
  full_name: string;
  phone: string;
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
  { symbol: "₴", label: "Гривня (₴)" },
  { symbol: "$", label: "Долар ($)" },
  { symbol: "€", label: "Євро (€)" },
];

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

function buildChips(f: Filters, refs: RefLists, onFiltersChange: (patch: Partial<Filters>) => void): Chip[] {
  const chips: Chip[] = [];
  const clear = (patch: Partial<Filters>) => onFiltersChange(patch);

  if (f.destination) chips.push({ id: "destination", label: f.destination, onRemove: () => clear({ destination: "" }) });
  if (f.countryId) {
    const name = refs.countries.find((c) => String(c.id) === f.countryId)?.name ?? "Країна";
    chips.push({ id: "country", label: name, onRemove: () => clear({ countryId: "" }) });
  }
  if (f.departureCityId) {
    const name = refs.departureCities.find((c) => String(c.id) === f.departureCityId)?.name ?? "Виліт";
    chips.push({ id: "departureCity", label: `Виліт: ${name}`, onRemove: () => clear({ departureCityId: "" }) });
  }
  if (f.goalCityId) {
    const name = refs.goalCities.find((c) => String(c.id) === f.goalCityId)?.name ?? "Курорт";
    chips.push({ id: "goalCity", label: name, onRemove: () => clear({ goalCityId: "" }) });
  }
  if (f.tourOperatorId) {
    const name = refs.operators.find((c) => String(c.id) === f.tourOperatorId)?.name ?? "Оператор";
    chips.push({ id: "operator", label: name, onRemove: () => clear({ tourOperatorId: "" }) });
  }
  if (f.resort) chips.push({ id: "resort", label: f.resort, onRemove: () => clear({ resort: "" }) });
  if (f.dateFrom || f.dateTo) {
    chips.push({
      id: "dates",
      label: (f.dateFrom && f.dateTo ? `${f.dateFrom} – ${f.dateTo}` : f.dateFrom || f.dateTo) + " (для заявки)",
      onRemove: () => clear({ dateFrom: "", dateTo: "" }),
    });
  }
  if (f.starsMin) chips.push({ id: "stars", label: `${f.starsMin}★ і вище`, onRemove: () => clear({ starsMin: "" }) });
  if (f.meal) chips.push({ id: "meal", label: f.meal, onRemove: () => clear({ meal: "" }) });
  if (f.nightsMin || f.nightsMax) {
    chips.push({
      id: "nights",
      label: `${f.nightsMin || "0"}–${f.nightsMax || "∞"} ночей`,
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
    const label = CURRENCY_OPTIONS.find((c) => c.symbol === f.currency)?.label ?? f.currency;
    chips.push({ id: "currency", label, onRemove: () => clear({ currency: "" }) });
  }
  if (f.adults !== EMPTY_FILTERS.adults) {
    chips.push({ id: "adults", label: `${f.adults} особи`, onRemove: () => clear({ adults: EMPTY_FILTERS.adults }) });
  }
  if (f.children) chips.push({ id: "children", label: "З дітьми", onRemove: () => clear({ children: false }) });
  if (f.hotOnly) chips.push({ id: "hot", label: "Гарячі 🔥", onRemove: () => clear({ hotOnly: false }) });

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
function Header({
  onProfile,
  onPage,
  onOpenFilters,
  user,
}: {
  onProfile: () => void;
  onPage: (p: Page) => void;
  onOpenFilters: () => void;
  user: User | null;
}) {
  const [langOpen, setLangOpen] = useState(false);
  const [lang, setLang] = useState("RU");

  return (
    <header style={{ background: "#1F7A53" }} className="w-full h-20 flex-shrink-0">
      <div className="max-w-[1200px] mx-auto px-6 h-full flex items-center justify-between">
        <button onClick={() => onPage("home")} className="flex items-center gap-3 group">
          <svg width="36" height="36" viewBox="0 0 36 36" fill="none">
            <path d="M18 4C10 4 4 10 4 18c0 3.5 1.2 6.7 3.2 9.2L18 32l10.8-4.8A14 14 0 0 0 32 18c0-7.7-6-14-14-14z" fill="none" stroke="#5CEAB2" strokeWidth="2.5" />
            <path d="M10 22c0-4.4 3.6-8 8-8s8 3.6 8 8" stroke="#5CEAB2" strokeWidth="2.5" strokeLinecap="round" />
          </svg>
          <span style={{ fontFamily: "Fraunces, serif", fontWeight: 600, fontSize: 18 }} className="text-white leading-tight">
            Вам повезло вибрати нас
          </span>
        </button>

        <nav className="flex items-center gap-6">
          <button className="text-white/90 hover:text-white text-sm font-medium transition-colors" onClick={onOpenFilters}>
            Розширений фільтр
          </button>

          <div className="relative">
            <button onClick={() => setLangOpen(!langOpen)} className="flex items-center gap-1 bg-white/10 hover:bg-white/20 text-white text-sm font-medium px-3 py-1.5 rounded-lg transition-colors">
              {lang}
              <svg width="14" height="14" viewBox="0 0 14 14" fill="currentColor">
                <path d="M3 5l4 4 4-4" stroke="currentColor" strokeWidth="1.5" fill="none" strokeLinecap="round" />
              </svg>
            </button>
            {langOpen && (
              <div className="absolute right-0 top-10 bg-white rounded-xl shadow-lg py-1 z-50 min-w-[80px]">
                {["RU", "UA"].map((l) => (
                  <button key={l} onClick={() => { setLang(l); setLangOpen(false); }} className="w-full text-left px-4 py-2 text-sm text-gray-800 hover:bg-gray-50 font-medium">
                    {l}
                  </button>
                ))}
              </div>
            )}
          </div>

          <button className="text-white/80 hover:text-white transition-colors" title="Історія">
            <svg width="22" height="22" viewBox="0 0 22 22" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round">
              <circle cx="11" cy="11" r="9" />
              <path d="M11 6v5l3 3" />
            </svg>
          </button>

          <button onClick={onProfile} className="relative text-white/80 hover:text-white transition-colors" title={user ? user.full_name || user.email : "Увійти / Зареєструватися"}>
            <svg width="22" height="22" viewBox="0 0 22 22" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round">
              <circle cx="11" cy="8" r="4" />
              <path d="M3 20c0-4.4 3.6-8 8-8s8 3.6 8 8" />
            </svg>
            {user && <span className="absolute -top-0.5 -right-0.5 w-2.5 h-2.5 rounded-full" style={{ background: "#5CEAB2" }} />}
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
  return (
    <section className="relative w-full" style={{ height: 480 }}>
      <img src={heroPhoto} alt="Coastal resort aerial view" className="absolute inset-0 w-full h-full object-cover" />
      <div className="absolute inset-0" style={{ background: "rgba(15,30,20,0.45)" }} />

      <div className="relative z-10 h-full flex flex-col items-center justify-center px-4">
        <h1 style={{ fontFamily: "Fraunces, serif", fontWeight: 700, fontSize: 42, color: "#fff", textShadow: "0 2px 12px rgba(0,0,0,0.4)" }} className="mb-8 text-center leading-tight">
          Знайдіть свій ідеальний відпочинок
        </h1>

        <div className="w-full" style={{ maxWidth: 1040, background: "rgba(255,255,255,0.97)", borderRadius: 20, padding: "28px 32px", boxShadow: "0 8px 40px rgba(0,0,0,0.22)", border: "1px solid #E2E4DF" }}>
          <div className="flex gap-4 flex-wrap">
            <div className="flex flex-col gap-1 flex-1 min-w-[180px]">
              <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Куди</label>
              <input
                value={filters.destination}
                onChange={(e) => onFiltersChange({ destination: e.target.value })}
                placeholder="Країна / місто"
                className="h-14 px-4 rounded-[10px] border text-sm font-medium focus:outline-none focus:ring-2 transition-all"
                style={{ border: "1px solid #E2E4DF", fontSize: 15 }}
              />
            </div>

            <div className="flex flex-col gap-1" style={{ minWidth: 180 }}>
              <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Дата (для заявки)</label>
              <div className="relative">
                <input
                  type="date"
                  value={filters.dateFrom}
                  onChange={(e) => onFiltersChange({ dateFrom: e.target.value })}
                  className="h-14 px-4 pr-10 rounded-[10px] border text-sm font-medium focus:outline-none focus:ring-2 transition-all w-full appearance-none"
                  style={{ border: "1px solid #E2E4DF", fontSize: 15 }}
                />
                <svg className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-gray-400" width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5">
                  <rect x="1" y="3" width="14" height="12" rx="2" />
                  <path d="M5 1v3M11 1v3M1 7h14" />
                </svg>
              </div>
            </div>

            <div className="flex flex-col gap-1" style={{ minWidth: 160 }}>
              <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Зірки готелю</label>
              <select
                value={filters.starsMin}
                onChange={(e) => onFiltersChange({ starsMin: e.target.value })}
                className="h-14 px-4 rounded-[10px] border text-sm font-medium focus:outline-none focus:ring-2 transition-all appearance-none bg-white"
                style={{ border: "1px solid #E2E4DF", fontSize: 15 }}
              >
                <option value="">Будь-які</option>
                {STAR_OPTIONS.map((n) => (
                  <option key={n} value={n}>{n} ★</option>
                ))}
              </select>
            </div>

            <div className="flex flex-col gap-1" style={{ minWidth: 160 }}>
              <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Кількість осіб</label>
              <Stepper value={filters.adults} onChange={(v) => onFiltersChange({ adults: v })} />
            </div>

            <div className="flex flex-col justify-end">
              <button onClick={onSearch} className="h-14 px-8 rounded-[10px] text-white font-semibold text-base transition-all hover:opacity-90 active:scale-95" style={{ background: "#2F6FED", minWidth: 140 }}>
                Пошук
              </button>
            </div>
          </div>

          <button onClick={onOpenFilters} className="mt-3 text-sm font-medium transition-opacity hover:opacity-70" style={{ color: "#2F6FED" }}>
            Розширений пошук →
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

  return (
    <div className="max-w-[1200px] mx-auto px-6 pt-10 pb-16">
      <h1 style={{ fontFamily: "Fraunces, serif", fontSize: 28, fontWeight: 700 }} className="mb-6">
        Розширений пошук
      </h1>

      <div style={{ background: "#fff", border: "1px solid #E2E4DF", borderRadius: 16, padding: 32 }}>
        <div className="grid gap-5 mb-5" style={{ gridTemplateColumns: "repeat(4, 1fr)" }}>
          <Field label="Готель / напрямок">
            <input
              value={filters.destination}
              onChange={(e) => onFiltersChange({ destination: e.target.value })}
              placeholder="Назва готелю або країна"
              className={fieldInputClass}
              style={fieldInputStyle}
            />
          </Field>

          <Field label="Країна">
            <select value={filters.countryId} onChange={(e) => handleCountryChange(e.target.value)} className={fieldInputClass + " appearance-none"} style={fieldInputStyle}>
              <option value="">Будь-яка</option>
              {refs.countries.map((c) => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
          </Field>

          <Field label="Місто вильоту">
            <select value={filters.departureCityId} onChange={(e) => onFiltersChange({ departureCityId: e.target.value })} className={fieldInputClass + " appearance-none"} style={fieldInputStyle}>
              <option value="">Будь-яке</option>
              {refs.departureCities.map((c) => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
          </Field>

          <Field label="Курорт / місто">
            <select value={filters.goalCityId} onChange={(e) => handleGoalCityChange(e.target.value)} className={fieldInputClass + " appearance-none"} style={fieldInputStyle}>
              <option value="">Будь-який</option>
              {visibleGoalCities.map((c) => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
          </Field>

          <Field label="Курортна зона">
            <select value={filters.resort} onChange={(e) => onFiltersChange({ resort: e.target.value })} className={fieldInputClass + " appearance-none"} style={fieldInputStyle}>
              <option value="">Будь-яка</option>
              {refs.resorts.map((r) => (
                <option key={r.id} value={r.name}>{r.name}</option>
              ))}
            </select>
          </Field>

          <Field label="Туроператор">
            <select value={filters.tourOperatorId} onChange={(e) => onFiltersChange({ tourOperatorId: e.target.value })} className={fieldInputClass + " appearance-none"} style={fieldInputStyle}>
              <option value="">Будь-який</option>
              {refs.operators.map((c) => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
          </Field>

          <Field label="Харчування">
            <select value={filters.meal} onChange={(e) => onFiltersChange({ meal: e.target.value })} className={fieldInputClass + " appearance-none"} style={fieldInputStyle}>
              <option value="">Будь-яке</option>
              {refs.mealTypes.map((m) => (
                <option key={m.id} value={m.name}>{m.name}</option>
              ))}
            </select>
          </Field>
        </div>

        <div className="grid gap-5 mb-5" style={{ gridTemplateColumns: "repeat(4, 1fr)" }}>
          <Field label="Дата вильоту з (для заявки)">
            <input type="date" value={filters.dateFrom} onChange={(e) => handleDateFromChange(e.target.value)} className={fieldInputClass} style={fieldInputStyle} />
          </Field>
          <Field label="Дата вильоту по (для заявки)">
            <input type="date" value={filters.dateTo} onChange={(e) => onFiltersChange({ dateTo: e.target.value })} className={fieldInputClass} style={fieldInputStyle} />
            <span className="text-[11px]" style={{ color: "#66716B" }}>Рахується автоматично за кількістю ночей — можна поправити вручну</span>
          </Field>
          <Field label="Ночей від">
            <input type="number" min={1} value={filters.nightsMin} onChange={(e) => handleNightsMinChange(e.target.value)} placeholder="1" className={fieldInputClass} style={fieldInputStyle} />
          </Field>
          <Field label="Ночей до">
            <input type="number" min={1} value={filters.nightsMax} onChange={(e) => handleNightsMaxChange(e.target.value)} placeholder="14" className={fieldInputClass} style={fieldInputStyle} />
          </Field>
        </div>

        <div className="grid gap-5 mb-6" style={{ gridTemplateColumns: "repeat(5, 1fr)" }}>
          <Field label="Ціна від">
            <input type="number" min={0} value={filters.priceMin} onChange={(e) => onFiltersChange({ priceMin: e.target.value })} placeholder="0" className={fieldInputClass} style={fieldInputStyle} />
          </Field>
          <Field label="Ціна до">
            <input type="number" min={0} value={filters.priceMax} onChange={(e) => onFiltersChange({ priceMax: e.target.value })} placeholder="2000" className={fieldInputClass} style={fieldInputStyle} />
          </Field>
          <Field label="Валюта">
            <select value={filters.currency} onChange={(e) => onFiltersChange({ currency: e.target.value })} className={fieldInputClass + " appearance-none"} style={fieldInputStyle}>
              <option value="">Будь-яка</option>
              {CURRENCY_OPTIONS.map((c) => (
                <option key={c.symbol} value={c.symbol}>{c.label}</option>
              ))}
            </select>
          </Field>
          <Field label="Зірки готелю">
            <select value={filters.starsMin} onChange={(e) => onFiltersChange({ starsMin: e.target.value })} className={fieldInputClass + " appearance-none"} style={fieldInputStyle}>
              <option value="">Будь-які</option>
              {STAR_OPTIONS.map((n) => (
                <option key={n} value={n}>{n}★ і вище</option>
              ))}
            </select>
          </Field>
          <Field label="Кількість осіб">
            <Stepper value={filters.adults} onChange={(v) => onFiltersChange({ adults: v })} />
          </Field>
        </div>

        <div className="flex flex-wrap items-center gap-6 mb-8">
          <Checkbox checked={filters.children} onChange={(v) => onFiltersChange({ children: v })} label="Подорож із дітьми" />
          <Checkbox checked={filters.hotOnly} onChange={(v) => onFiltersChange({ hotOnly: v })} label="Тільки гарячі тури 🔥" />
        </div>

        <div className="flex gap-3">
          <button onClick={onSubmit} className="px-8 rounded-[10px] text-white font-semibold text-base transition-all hover:opacity-90 active:scale-95" style={{ background: "#2F6FED", height: 52 }}>
            Знайти тури
          </button>
          <button onClick={onReset} className="px-6 rounded-[10px] font-semibold text-sm transition-colors hover:bg-gray-50" style={{ border: "1px solid #E2E4DF", height: 52, color: "#1F2A24" }}>
            Скинути фільтри
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Tour Card ─────────────────────────────────────────────────────────────────
function TourCard({ tour, onBook, onDetails }: { tour: Tour; onBook: (t: Tour) => void; onDetails: (t: Tour) => void }) {
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
        <p className="mt-2 text-sm" style={{ color: "#66716B" }}>{tour.nights} ночей · {tour.country} · {tour.meal}</p>
        <p style={{ fontFamily: "Fraunces, serif", fontSize: 22, fontWeight: 700, color: "#1F7A53" }} className="mt-3">{tour.price}</p>
        <button onClick={(e) => { e.stopPropagation(); onBook(tour); }} className="mt-4 w-full h-12 rounded-[10px] text-white font-semibold text-sm transition-all hover:opacity-90" style={{ background: "#2F6FED" }}>
          Забронювати
        </button>
      </div>
    </div>
  );
}

// ─── Hot Tours ─────────────────────────────────────────────────────────────────
function HotTours({ tours, loading, onBook, onDetails }: { tours: Tour[]; loading: boolean; onBook: (t: Tour) => void; onDetails: (t: Tour) => void }) {
  const rowRef = useRef<HTMLDivElement>(null);
  const scroll = (dir: number) => rowRef.current?.scrollBy({ left: dir * 306, behavior: "smooth" });

  return (
    <section className="max-w-[1200px] mx-auto px-6 mt-14 pb-16">
      <div className="flex items-center justify-between mb-6">
        <h2 style={{ fontFamily: "Fraunces, serif", fontSize: 28, fontWeight: 700 }}>Гарячі тури</h2>
        <div className="flex gap-2">
          {["‹", "›"].map((ch, i) => (
            <button key={ch} onClick={() => scroll(i === 0 ? -1 : 1)} className="w-10 h-10 rounded-full flex items-center justify-center text-lg font-bold transition-all hover:bg-gray-100" style={{ border: "1px solid #E2E4DF", color: "#1F2A24" }}>
              {ch}
            </button>
          ))}
        </div>
      </div>
      {loading && <p style={{ color: "#66716B" }}>Завантаження турів…</p>}
      {!loading && tours.length === 0 && <p style={{ color: "#66716B" }}>Гарячих турів поки немає.</p>}
      <div ref={rowRef} className="flex gap-6 overflow-x-auto pb-2" style={{ scrollbarWidth: "none" }}>
        {tours.map((t) => (
          <TourCard key={t.id} tour={t} onBook={onBook} onDetails={onDetails} />
        ))}
      </div>
    </section>
  );
}

// ─── About ─────────────────────────────────────────────────────────────────────
function About() {
  return (
    <section className="max-w-[1200px] mx-auto px-6 py-16">
      <div className="grid gap-16" style={{ gridTemplateColumns: "1fr 440px" }}>
        <div>
          <h2 style={{ fontFamily: "Fraunces, serif", fontSize: 28, fontWeight: 700 }} className="mb-6">Про турагента</h2>
          <div className="space-y-4 text-base leading-7" style={{ color: "#1F2A24", lineHeight: "26px" }}>
            <p>Ми — команда досвідчених фахівців із туристичного бізнесу з понад 12-річним досвідом роботи на ринку. Щороку ми допомагаємо тисячам сімей та пар здійснити мрію про ідеальну відпустку.</p>
            <p>Наш підхід простий: глибоке знання напрямків, чесні ціни та особистий супровід на кожному етапі — від вибору готелю до повернення додому.</p>
            <p>Ми співпрацюємо лише з перевіреними операторами та готелями, щоб ваша подорож була безтурботною та незабутньою.</p>
          </div>
          <a href="viber://chat" className="inline-flex items-center gap-2 mt-6 font-semibold text-sm transition-opacity hover:opacity-80" style={{ color: "#2F6FED" }}>
            <svg width="18" height="18" viewBox="0 0 18 18" fill="#7360F2">
              <rect width="18" height="18" rx="5" fill="#7360F2" />
              <path d="M9 3C5.7 3 3 5.5 3 8.6c0 1.8.9 3.4 2.3 4.4V15l1.8-1c.6.2 1.2.3 1.9.3 3.3 0 6-2.5 6-5.6S12.3 3 9 3z" fill="white" />
            </svg>
            Написати нам у Viber
          </a>
        </div>
        <div className="space-y-3">
          {[
            { name: "Олена Мороз", text: "Відпочинок у Туреччині вийшов просто чудовим! Менеджер врахував усі наші побажання." },
            { name: "Дмитро Коваль", text: "Вже четвертий рік поспіль бронюємо через це агентство. Завжди якісно і без сюрпризів." },
            { name: "Аліна Шевченко", text: "Організували тур для компанії 8 осіб. Все пройшло ідеально, дякуємо!" },
          ].map((r) => (
            <div key={r.name} className="p-5" style={{ background: "#fff", borderRadius: 12, border: "1px solid #E2E4DF", boxShadow: "0 2px 8px rgba(31,42,36,0.04)" }}>
              <div className="flex items-center justify-between mb-2">
                <span className="font-semibold text-sm">{r.name}</span>
                <Stars count={5} size={13} />
              </div>
              <p className="text-sm leading-6" style={{ color: "#66716B" }}>{r.text}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

// ─── Footer ───────────────────────────────────────────────────────────────────
function Footer() {
  return (
    <footer style={{ background: "#1F7A53" }} className="w-full">
      <div className="max-w-[1200px] mx-auto px-6 py-12">
        <div className="grid grid-cols-3 gap-8 text-white">
          <div>
            <div className="flex items-center gap-2 mb-3">
              <svg width="30" height="30" viewBox="0 0 36 36" fill="none">
                <path d="M18 4C10 4 4 10 4 18c0 3.5 1.2 6.7 3.2 9.2L18 32l10.8-4.8A14 14 0 0 0 32 18c0-7.7-6-14-14-14z" fill="none" stroke="#5CEAB2" strokeWidth="2.5" />
                <path d="M10 22c0-4.4 3.6-8 8-8s8 3.6 8 8" stroke="#5CEAB2" strokeWidth="2.5" strokeLinecap="round" />
              </svg>
              <span style={{ fontFamily: "Fraunces, serif", fontWeight: 600, fontSize: 16 }}>Вам повезло вибрати нас</span>
            </div>
            <p className="text-sm leading-6 text-white/70">Ваш надійний партнер у світі подорожей. Організовуємо незабутній відпочинок з 2012 року.</p>
          </div>
          <div>
            <h4 className="font-semibold mb-4">Контакти</h4>
            <div className="space-y-2 text-sm text-white/80">
              <a href="tel:+380441234567" className="block hover:text-white transition-colors">+38 (044) 123-45-67</a>
              <a href="tel:+380671234567" className="block hover:text-white transition-colors">+38 (067) 123-45-67</a>
              <a href="mailto:info@touragency.ua" className="block hover:text-white transition-colors">info@touragency.ua</a>
            </div>
          </div>
          <div>
            <h4 className="font-semibold mb-4">Ми в соцмережах</h4>
            <div className="flex gap-3">
              {["Instagram", "Facebook", "Telegram", "Viber"].map((s) => (
                <a key={s} href="#" className="w-9 h-9 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-xs font-bold transition-colors" title={s}>{s[0]}</a>
              ))}
            </div>
          </div>
        </div>
        <div className="mt-8 pt-5 flex items-center justify-between text-xs" style={{ borderTop: "1px solid rgba(255,255,255,0.2)", color: "rgba(255,255,255,0.6)" }}>
          <span>© 2026 Турагентство «Вам повезло». Всі права захищені.</span>
          <span>Розроблено з ♥ для мандрівників</span>
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
  const [success, setSuccess] = useState(false);
  const [email, setEmail] = useState(user?.email ?? "");
  const [phone, setPhone] = useState(user?.phone ?? "");
  const [name, setName] = useState(user?.full_name ?? "");
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [departureDate, setDepartureDate] = useState(preferredDateFrom || "");

  // Дата повернення рахується автоматично з дати вильоту + кількість ночей
  // САМЕ цього туру (Tour.nights) — це те, що вже "розраховано в турі", тож
  // вручну другу дату вводити не треба. Якщо кількість ночей з якоїсь
  // причини невідома — підстраховуємось раніше введеним preferredDateTo.
  const returnDate = tourNights != null ? addNights(departureDate, tourNights) : preferredDateTo;

  const missingFields = !email.trim() || !phone.trim() || !name.trim();
  const canSubmit = !missingFields && !submitting;
  const [preferredContact, setPreferredContact] = useState<"viber" | "telegram">("telegram");

  async function submit() {
    if (!canSubmit) return;
    setSubmitting(true);
    setSubmitError(null);
    try {
      const res = await fetch(`${API_URL}/booking-requests/`, {
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
      setSubmitError("Не вдалося відправити заявку. Спробуйте ще раз.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center" style={{ background: "rgba(15,25,20,0.55)" }} onClick={(e) => e.target === e.currentTarget && onClose()}>
      <img src={heroPhoto} alt="" className="absolute inset-0 w-full h-full object-cover" style={{ filter: "blur(4px) brightness(0.35)", transform: "scale(1.05)" }} />

      <div className="relative z-10 w-full" style={{ maxWidth: 520, background: "#fff", borderRadius: 20, padding: 32, boxShadow: "0 16px 48px rgba(31,42,36,0.18)", margin: "0 16px" }}>
        {!success ? (
          <>
            <div className="flex items-center justify-between mb-6">
              <h2 style={{ fontFamily: "Fraunces, serif", fontSize: 24, fontWeight: 700 }}>Заявка на тур</h2>
              <button onClick={onClose} className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-gray-100 text-gray-400 text-xl transition-colors">×</button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">Тур</label>
                <div className="h-13 px-4 flex items-center rounded-[10px] text-sm font-medium" style={{ background: "#F7F8F6", border: "1px solid #E2E4DF", height: 52 }}>{tourName}</div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">Дата вильоту</label>
                  <input
                    type="date"
                    value={departureDate}
                    onChange={(e) => setDepartureDate(e.target.value)}
                    className="w-full px-4 rounded-[10px] text-sm font-medium focus:outline-none focus:ring-2 focus:ring-blue-400 transition-all"
                    style={{ border: "1px solid #E2E4DF", height: 52 }}
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">
                    Дата повернення{tourNights != null ? ` (${tourNights} ноч.)` : ""}
                  </label>
                  <div className="h-13 px-4 flex items-center rounded-[10px] text-sm font-medium" style={{ background: "#F7F8F6", border: "1px solid #E2E4DF", height: 52 }}>
                    {returnDate || "оберіть дату вильоту"}
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">
                  Email {!email.trim() && <span style={{ color: "#D64545" }}>*</span>}
                </label>
                <input value={email} onChange={e => setEmail(e.target.value)} placeholder="Введіть email" className="w-full h-13 px-4 rounded-[10px] text-sm font-medium focus:outline-none focus:ring-2 focus:ring-blue-400 transition-all" style={{ border: "1px solid #E2E4DF", height: 52 }} />
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">
                  Телефон {!phone.trim() && <span style={{ color: "#D64545" }}>*</span>}
                </label>
                <input value={phone} onChange={e => setPhone(e.target.value)} placeholder="+380..." className="w-full px-4 rounded-[10px] text-sm font-medium focus:outline-none focus:ring-2 focus:ring-blue-400 transition-all" style={{ border: "1px solid #E2E4DF", height: 52 }} />
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">
                  Ім'я {!name.trim() && <span style={{ color: "#D64545" }}>*</span>}
                </label>
                <input value={name} onChange={e => setName(e.target.value)} placeholder="Введіть ім'я" className="w-full px-4 rounded-[10px] text-sm font-medium focus:outline-none focus:ring-2 focus:ring-blue-400 transition-all" style={{ border: "1px solid #E2E4DF", height: 52 }} />
              </div>
            </div>

            {missingFields && !submitting && (
              <p className="mt-3 text-xs" style={{ color: "#66716B" }}>Заповніть email, телефон та ім'я, щоб продовжити.</p>
            )}
            {submitError && <p className="mt-3 text-sm text-red-500">{submitError}</p>}

            <div className="mt-6">
              <p className="text-sm font-semibold mb-3" style={{ color: "#1F2A24" }}>Як з вами краще зв'язатися?</p>
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
                {submitting ? "Відправка…" : "Надіслати заявку"}
              </button>
            </div>
          </>
        ) : (
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <div className="w-14 h-14 rounded-full flex items-center justify-center mb-6" style={{ background: "#E8F5EF" }}>
              <svg width="28" height="28" viewBox="0 0 28 28" fill="none"><path d="M6 14l5 5 11-10" stroke="#1F7A53" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" /></svg>
            </div>
            <h3 style={{ fontFamily: "Fraunces, serif", fontSize: 22, fontWeight: 600, maxWidth: 380 }} className="leading-8 mb-8">Вашу заявку надіслано менеджеру, очікуйте зворотного зв'язку</h3>
            <button onClick={onClose} className="w-40 h-10 rounded-[10px] font-semibold text-sm transition-all hover:opacity-90" style={{ background: "#2F6FED", color: "#fff" }}>Закрити</button>
          </div>
        )}
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
  const [mode, setMode] = useState<"login" | "register">("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [authError, setAuthError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const [editing, setEditing] = useState(false);
  const [fullName, setFullName] = useState(user?.full_name ?? "");
  const [phone, setPhone] = useState(user?.phone ?? "");
  const [savingProfile, setSavingProfile] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);

  useEffect(() => {
    setFullName(user?.full_name ?? "");
    setPhone(user?.phone ?? "");
  }, [user]);

  async function submitAuth() {
    setSubmitting(true);
    setAuthError(null);
    try {
      const path = mode === "login" ? "/auth/login/" : "/auth/register/";
      const res = await apiFetch(path, { method: "POST", body: JSON.stringify({ email, password }) });
      const data = await res.json();
      if (!res.ok) {
        setAuthError(data.detail || data.email?.[0] || data.password?.[0] || data.non_field_errors?.[0] || "Помилка. Перевірте дані.");
        return;
      }
      onAuthed(data);
    } catch {
      setAuthError("Немає з'єднання з сервером.");
    } finally {
      setSubmitting(false);
    }
  }

  async function saveProfile() {
    setSavingProfile(true);
    try {
      const res = await apiFetch("/auth/profile/", { method: "PATCH", body: JSON.stringify({ full_name: fullName, phone }) });
      if (res.ok) {
        onAuthed(await res.json());
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
    <div className="fixed inset-0 z-50 flex items-center justify-center" style={{ background: "rgba(15,25,20,0.55)" }} onClick={(e) => e.target === e.currentTarget && onClose()}>
      <img src={heroPhoto} alt="" className="absolute inset-0 w-full h-full object-cover" style={{ filter: "blur(4px) brightness(0.35)", transform: "scale(1.05)" }} />

      <div className="relative z-10 w-full" style={{ maxWidth: 440, background: "#fff", borderRadius: 20, padding: 32, boxShadow: "0 16px 48px rgba(31,42,36,0.18)", margin: "0 16px" }}>
        {!user ? (
          <>
            <div className="flex items-center justify-between mb-6">
              <h2 style={{ fontFamily: "Fraunces, serif", fontSize: 24, fontWeight: 700 }}>
                {mode === "login" ? "Вхід" : "Реєстрація"}
              </h2>
              <button onClick={onClose} className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-gray-100 text-gray-400 text-xl transition-colors">×</button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">Email</label>
                <input value={email} onChange={(e) => setEmail(e.target.value)} placeholder="Введіть email" className="w-full px-4 rounded-[10px] text-sm font-medium focus:outline-none focus:ring-2 focus:ring-blue-400 transition-all" style={{ border: "1px solid #E2E4DF", height: 52 }} />
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">Пароль</label>
                <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Введіть пароль" className="w-full px-4 rounded-[10px] text-sm font-medium focus:outline-none focus:ring-2 focus:ring-blue-400 transition-all" style={{ border: "1px solid #E2E4DF", height: 52 }} />
              </div>
            </div>

            {authError && <p className="mt-3 text-sm text-red-500">{authError}</p>}

            <button
              onClick={submitAuth}
              disabled={submitting || !email.trim() || !password.trim()}
              className="w-full mt-6 rounded-[10px] text-white font-semibold text-base transition-all hover:opacity-90 disabled:opacity-50"
              style={{ background: "#2F6FED", height: 52 }}
            >
              {submitting ? "Зачекайте…" : mode === "login" ? "Увійти" : "Зареєструватися"}
            </button>

            <p className="text-center text-sm mt-4" style={{ color: "#66716B" }}>
              {mode === "login" ? (
                <>Немає акаунту?{" "}
                  <button onClick={() => { setMode("register"); setAuthError(null); }} className="font-semibold" style={{ color: "#2F6FED" }}>Зареєструватися</button>
                </>
              ) : (
                <>Вже є акаунт?{" "}
                  <button onClick={() => { setMode("login"); setAuthError(null); }} className="font-semibold" style={{ color: "#2F6FED" }}>Увійти</button>
                </>
              )}
            </p>
          </>
        ) : confirmDelete ? (
          <div className="text-center py-6">
            <div className="w-14 h-14 rounded-full bg-red-50 flex items-center justify-center mx-auto mb-4">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#D64545" strokeWidth="2" strokeLinecap="round"><path d="M12 9v4M12 17h.01M10.3 3.5L2 20h20L13.7 3.5a2 2 0 0 0-3.4 0z" /></svg>
            </div>
            <h3 style={{ fontFamily: "Fraunces, serif", fontSize: 20, fontWeight: 700 }} className="mb-2">Видалити акаунт?</h3>
            <p className="text-sm text-gray-500 mb-6">Ця дія незворотна. Усі ваші дані будуть видалені.</p>
            <div className="flex gap-3">
              <button onClick={() => setConfirmDelete(false)} className="flex-1 h-12 rounded-[10px] font-semibold text-sm border transition-colors hover:bg-gray-50" style={{ border: "1px solid #E2E4DF" }}>Скасувати</button>
              <button onClick={deleteAccount} className="flex-1 h-12 rounded-[10px] font-semibold text-sm text-white transition-opacity hover:opacity-90" style={{ background: "#D64545" }}>Так, видалити</button>
            </div>
          </div>
        ) : (
          <>
            <div className="flex items-center justify-between mb-6">
              <h2 style={{ fontFamily: "Fraunces, serif", fontSize: 24, fontWeight: 700 }}>Профіль</h2>
              <button onClick={onClose} className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-gray-100 text-gray-400 text-xl transition-colors">×</button>
            </div>

            <div className="space-y-5 mb-8">
              <div>
                <p className="text-xs font-semibold uppercase tracking-wide mb-1" style={{ color: "#66716B" }}>Email</p>
                <p className="text-base font-semibold">{user.email}</p>
              </div>
              <div>
                <p className="text-xs font-semibold uppercase tracking-wide mb-1" style={{ color: "#66716B" }}>Ім'я</p>
                {editing ? (
                  <input value={fullName} onChange={(e) => setFullName(e.target.value)} placeholder="Введіть ім'я" className="w-full px-3 py-2 rounded-[10px] text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-blue-300" style={{ border: "1px solid #E2E4DF" }} />
                ) : (
                  <p className="text-base font-semibold">{user.full_name || "— не вказано —"}</p>
                )}
              </div>
              <div>
                <p className="text-xs font-semibold uppercase tracking-wide mb-1" style={{ color: "#66716B" }}>Телефон</p>
                {editing ? (
                  <input value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="+380..." className="w-full px-3 py-2 rounded-[10px] text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-blue-300" style={{ border: "1px solid #E2E4DF" }} />
                ) : (
                  <p className="text-base font-semibold">{user.phone || "— не вказано —"}</p>
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
                {savingProfile ? "Збереження…" : editing ? "Зберегти" : "Редагувати"}
              </button>
              <button onClick={logout} className="flex-1 h-12 rounded-[10px] text-sm font-medium transition-colors hover:bg-gray-50" style={{ border: "1px solid #E2E4DF", color: "#1F2A24" }}>
                Вийти
              </button>
            </div>

            <button onClick={() => setConfirmDelete(true)} className="w-full h-12 rounded-[10px] text-white font-semibold text-sm transition-opacity hover:opacity-90" style={{ background: "#D64545" }}>
              Видалити акаунт
            </button>
          </>
        )}
      </div>
    </div>
  );
}

// ─── Search Results Page ───────────────────────────────────────────────────────
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
  const [page, setPage] = useState(1);

  return (
    <div className="max-w-[1200px] mx-auto px-6 pt-10 pb-16">
      <div className="flex flex-wrap items-center justify-between gap-4 mb-2">
        <h1 style={{ fontFamily: "Fraunces, serif", fontSize: 28, fontWeight: 700 }}>Результати пошуку</h1>
        <button
          onClick={onOpenFilters}
          className="text-sm font-medium px-4 py-2 rounded-full transition-colors hover:bg-blue-50"
          style={{ border: "1px solid #2F6FED", color: "#2F6FED" }}
        >
          Розширені параметри
        </button>
      </div>

      {!loading && (
        <p className="text-sm mb-4" style={{ color: "#66716B" }}>Знайдено турів: {tours.length}</p>
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

      {loading && <p style={{ color: "#66716B" }}>Завантаження турів…</p>}
      {!loading && tours.length === 0 && <p style={{ color: "#66716B" }}>За вашим запитом нічого не знайдено.</p>}

      <div className="space-y-4">
        {tours.map((t) => (
          <div key={t.id} onClick={() => onDetails(t)} className="flex items-center gap-0 cursor-pointer hover:shadow-md transition-shadow" style={{ background: "#fff", border: "1px solid #E2E4DF", borderRadius: 16, overflow: "hidden", minHeight: 190 }}>
            <img src={t.img} alt={t.name} className="object-cover flex-shrink-0" style={{ width: 240, height: 190 }} />
            <div className="flex-1 px-6 py-4">
              <h3 style={{ fontFamily: "Fraunces, serif", fontSize: 20, fontWeight: 700 }} className="mb-1">{t.name}</h3>
              <Stars count={t.stars} />
              <p className="mt-2 text-sm" style={{ color: "#66716B" }}>{t.nights} ночей · {t.country} · {t.meal}</p>
              <p style={{ fontFamily: "Fraunces, serif", fontSize: 22, fontWeight: 700, color: "#1F7A53" }} className="mt-3">{t.price}</p>
            </div>
            <div className="flex-shrink-0 px-6 flex items-center justify-center">
              <button onClick={(e) => { e.stopPropagation(); onBook(t); }} className="w-36 h-12 rounded-[10px] text-white font-semibold text-sm transition-all hover:opacity-90" style={{ background: "#2F6FED" }}>Забронювати</button>
            </div>
          </div>
        ))}
      </div>

      {tours.length > 0 && (
        <div className="flex items-center justify-center gap-2 mt-10">
          {[1, 2, 3, 4, 5].map((n) => (
            <button key={n} onClick={() => setPage(n)} className="w-10 h-10 rounded-full text-sm font-semibold transition-all" style={{ background: page === n ? "#2F6FED" : "#fff", color: page === n ? "#fff" : "#1F2A24", border: "1px solid " + (page === n ? "#2F6FED" : "#E2E4DF") }}>{n}</button>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Tour Details Page ─────────────────────────────────────────────────────────
function TourDetailsPage({ tourId, onBook }: { tourId: number | null; onBook: (t: Tour) => void }) {
  const [detail, setDetail] = useState<TourDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeImg, setActiveImg] = useState(0);

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

  if (loading) return <div className="max-w-[1200px] mx-auto px-6 pt-10 pb-16"><p style={{ color: "#66716B" }}>Завантаження туру…</p></div>;
  if (!detail) return <div className="max-w-[1200px] mx-auto px-6 pt-10 pb-16"><p style={{ color: "#66716B" }}>Тур не знайдено.</p></div>;

  const images = detail.photos.length > 0 ? detail.photos : [detail.img];

  return (
    <div className="max-w-[1200px] mx-auto px-6 pt-10 pb-16">
      <div className="grid gap-10 mb-14" style={{ gridTemplateColumns: "1fr 400px" }}>
        <div>
          <div className="relative rounded-2xl overflow-hidden" style={{ height: 380 }}>
            <img src={images[activeImg]} alt={detail.name} className="w-full h-full object-cover" />
            {images.length > 1 && (
              <>
                <button onClick={() => setActiveImg((activeImg - 1 + images.length) % images.length)} className="absolute left-4 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full bg-white/80 hover:bg-white flex items-center justify-center text-lg font-bold transition-all">‹</button>
                <button onClick={() => setActiveImg((activeImg + 1) % images.length)} className="absolute right-4 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full bg-white/80 hover:bg-white flex items-center justify-center text-lg font-bold transition-all">›</button>
              </>
            )}
          </div>
          {images.length > 1 && (
            <div className="flex gap-2 mt-3">
              {images.map((img, i) => (
                <img key={i} src={img} alt="" onClick={() => setActiveImg(i)} className="rounded-xl object-cover cursor-pointer transition-all" style={{ width: 72, height: 64, border: i === activeImg ? "2px solid #2F6FED" : "2px solid transparent", opacity: i === activeImg ? 1 : 0.7 }} />
              ))}
            </div>
          )}
        </div>

        <div style={{ background: "#fff", border: "1px solid #E2E4DF", borderRadius: 16, padding: 32 }}>
          <h1 style={{ fontFamily: "Fraunces, serif", fontSize: 28, fontWeight: 700, lineHeight: 1.2 }}>{detail.name}</h1>
          <div className="mt-3"><Stars count={detail.stars} size={18} /></div>
          <div className="mt-5 space-y-2 text-base" style={{ color: "#66716B" }}>
            <p>📍 {detail.country}</p>
            <p>🌙 {detail.nights} ночей</p>
            <p>🍽 {detail.meal}</p>
          </div>
          <p style={{ fontFamily: "Fraunces, serif", fontSize: 32, fontWeight: 700, color: "#1F7A53" }} className="mt-6">{detail.price}</p>
          <button onClick={() => onBook(detail)} className="w-full mt-6 rounded-[10px] text-white font-semibold text-base transition-all hover:opacity-90" style={{ background: "#2F6FED", height: 56 }}>Забронювати</button>
        </div>
      </div>

      <div style={{ background: "#fff", border: "1px solid #E2E4DF", borderRadius: 16, padding: 40 }} className="mb-12">
        <h2 style={{ fontFamily: "Fraunces, serif", fontSize: 24, fontWeight: 700 }} className="mb-5">Опис туру</h2>
        <div className="space-y-4 text-base leading-7" style={{ color: "#1F2A24", maxWidth: 1000 }}>
          <p>{detail.description || "Опис готелю поки не додано менеджером."}</p>
        </div>
      </div>

      <h2 style={{ fontFamily: "Fraunces, serif", fontSize: 24, fontWeight: 700 }} className="mb-6">Відгуки</h2>
      <div className="grid grid-cols-3 gap-6">
        {[
          { name: "Марина Іваненко", date: "12 серпня 2026", text: "Неймовірний готель! Сервіс на найвищому рівні, персонал дуже уважний. Обов'язково повернемося." },
          { name: "Олексій Петров", date: "5 серпня 2026", text: "Чудовий відпочинок для всієї родини. Діти в захваті від анімації, дорослі від SPA та ресторанів." },
          { name: "Тетяна Бойко", date: "28 липня 2026", text: "Все включено на справді відмінному рівні. Смачна їжа, чисті пляжі, гарні номери. Рекомендую!" },
        ].map((r) => (
          <div key={r.name} style={{ background: "#fff", border: "1px solid #E2E4DF", borderRadius: 14, padding: 24 }}>
            <div className="flex items-start justify-between mb-3">
              <div><p className="font-semibold text-sm">{r.name}</p><p className="text-xs mt-0.5" style={{ color: "#66716B" }}>{r.date}</p></div>
              <Stars count={5} size={13} />
            </div>
            <p className="text-sm leading-6" style={{ color: "#66716B" }}>{r.text}</p>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── App ───────────────────────────────────────────────────────────────────────
export default function App() {
  const [page, setPage] = useState<Page>("home");
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

  // ── Auth ──────────────────────────────────────────────────────────────────
  const [user, setUser] = useState<User | null>(null);
  const [userLoading, setUserLoading] = useState(true);
  // Якщо гість тиснув "Забронювати" — запам'ятовуємо намір, і одразу після
  // успішного логіна/реєстрації відкриваємо саме форму брони, а не профіль.
  const [pendingBooking, setPendingBooking] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        await apiFetch("/auth/csrf/");
        const res = await apiFetch("/auth/me/");
        if (res.ok && !cancelled) {
          setUser(await res.json());
        }
      } catch {
        // бекенд недоступний або гість — просто лишаємось незалогіненими
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

  const handleLoggedOut = () => {
    setUser(null);
  };

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch(`${API_URL}/tours/`);
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const data: Tour[] = await res.json();
        if (!cancelled) setTours(data);
      } catch {
        if (!cancelled) setToursError("Не вдалося завантажити тури. Перевір, чи запущений бекенд (python manage.py runserver) і чи вказаний правильний VITE_API_URL.");
      } finally {
        if (!cancelled) setToursLoading(false);
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
  const chips = useMemo(() => buildChips(filters, refs, setFilters), [filters, countries, departureCities, goalCities, operators]);

  const hotTours = tours.filter((t) => t.is_hot);

  const openBooking = (tour: Tour) => {
    setSelectedTour(tour);
    if (!user) {
      // Гість — спочатку відправляємо на вхід/реєстрацію, бронь відкриється
      // автоматично одразу після успішного логіна (див. handleAuthed).
      setPendingBooking(true);
      setModal("profile");
      return;
    }
    setModal("booking");
  };

  const openDetails = (tour: Tour) => {
    setSelectedTour(tour);
    setPage("tour");
  };

  const openProfile = () => {
    setPendingBooking(false);
    setModal("profile");
  };

  const openFilters = () => setPage("filters");
  const runSearch = () => setPage("results");

  return (
    <div className="min-h-full flex flex-col" style={{ background: "#F7F8F6" }}>
      <Header onProfile={openProfile} onPage={setPage} onOpenFilters={openFilters} user={user} />

      {toursError && (
        <div className="max-w-[1200px] mx-auto px-6 mt-4 w-full">
          <div style={{ background: "#FDECEC", border: "1px solid #F3B4B4", color: "#8A2E2E", borderRadius: 10, padding: "10px 16px", fontSize: 14 }}>{toursError}</div>
        </div>
      )}

      <main className="flex-1">
        {page === "home" && (
          <>
            <Hero filters={filters} onFiltersChange={setFilters} onSearch={runSearch} onOpenFilters={openFilters} />
            <HotTours tours={hotTours} loading={toursLoading} onBook={openBooking} onDetails={openDetails} />
            <About />
          </>
        )}
        {page === "tour" && (
          <TourDetailsPage tourId={selectedTour?.id ?? null} onBook={openBooking} />
        )}
        {page === "results" && (
          <SearchResultsPage tours={filteredTours} loading={toursLoading} onBook={openBooking} onDetails={openDetails} chips={chips} onOpenFilters={openFilters} />
        )}
        {page === "filters" && (
          <AdvancedFilterPage
            filters={filters}
            onFiltersChange={setFilters}
            onReset={() => setFiltersState(EMPTY_FILTERS)}
            onSubmit={runSearch}
            refs={refs}
          />
        )}
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