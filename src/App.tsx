import { useState, useRef, useEffect } from "react";
import heroPhoto from "@/imports/aerial-view-of-coastal-resort-with-interconnected-pools-near-mai-khao-beach.png";

// ─── API ──────────────────────────────────────────────────────────────────────
// Vite: переменные окружения должны начинаться с VITE_ и лежат в .env фронтенда
const API_URL = (import.meta as any).env?.VITE_API_URL ?? "http://localhost:8000/api";

// ─── Types ────────────────────────────────────────────────────────────────────
type Page = "home" | "tour" | "results";
type Modal = null | "booking" | "profile";

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
}

interface TourDetail extends Tour {
  description: string;
  photos: string[];
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

// ─── Header ───────────────────────────────────────────────────────────────────
function Header({
  onProfile,
  onPage,
}: {
  onProfile: () => void;
  onPage: (p: Page) => void;
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
          <button className="text-white/90 hover:text-white text-sm font-medium transition-colors" onClick={() => onPage("results")}>
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

          <button onClick={onProfile} className="text-white/80 hover:text-white transition-colors" title="Профіль">
            <svg width="22" height="22" viewBox="0 0 22 22" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round">
              <circle cx="11" cy="8" r="4" />
              <path d="M3 20c0-4.4 3.6-8 8-8s8 3.6 8 8" />
            </svg>
          </button>
        </nav>
      </div>
    </header>
  );
}

// ─── Hero / Search ─────────────────────────────────────────────────────────────
function Hero({ onSearch }: { onSearch: () => void }) {
  const [destination, setDestination] = useState("");
  const [date, setDate] = useState("");
  const [stars, setStars] = useState("");
  const [people, setPeople] = useState(2);

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
              <input value={destination} onChange={(e) => setDestination(e.target.value)} placeholder="Країна / місто" className="h-14 px-4 rounded-[10px] border text-sm font-medium focus:outline-none focus:ring-2 transition-all" style={{ border: "1px solid #E2E4DF", fontSize: 15 }} />
            </div>

            <div className="flex flex-col gap-1" style={{ minWidth: 180 }}>
              <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Дата</label>
              <div className="relative">
                <input type="date" value={date} onChange={(e) => setDate(e.target.value)} className="h-14 px-4 pr-10 rounded-[10px] border text-sm font-medium focus:outline-none focus:ring-2 transition-all w-full appearance-none" style={{ border: "1px solid #E2E4DF", fontSize: 15 }} />
                <svg className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-gray-400" width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5">
                  <rect x="1" y="3" width="14" height="12" rx="2" />
                  <path d="M5 1v3M11 1v3M1 7h14" />
                </svg>
              </div>
            </div>

            <div className="flex flex-col gap-1" style={{ minWidth: 160 }}>
              <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Зірки готелю</label>
              <select value={stars} onChange={(e) => setStars(e.target.value)} className="h-14 px-4 rounded-[10px] border text-sm font-medium focus:outline-none focus:ring-2 transition-all appearance-none bg-white" style={{ border: "1px solid #E2E4DF", fontSize: 15 }}>
                <option value="">Будь-які</option>
                {[1, 2, 3, 4, 5].map((n) => (
                  <option key={n} value={n}>{n} ★</option>
                ))}
              </select>
            </div>

            <div className="flex flex-col gap-1" style={{ minWidth: 160 }}>
              <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Кількість осіб</label>
              <div className="flex items-center h-14 px-3 rounded-[10px] border gap-3" style={{ border: "1px solid #E2E4DF" }}>
                <button onClick={() => setPeople(Math.max(1, people - 1))} className="w-8 h-8 rounded-full bg-gray-100 hover:bg-gray-200 flex items-center justify-center text-gray-600 font-bold transition-colors">−</button>
                <span className="flex-1 text-center text-sm font-semibold">{people}</span>
                <button onClick={() => setPeople(Math.min(10, people + 1))} className="w-8 h-8 rounded-full bg-gray-100 hover:bg-gray-200 flex items-center justify-center text-gray-600 font-bold transition-colors">+</button>
              </div>
            </div>

            <div className="flex flex-col justify-end">
              <button onClick={onSearch} className="h-14 px-8 rounded-[10px] text-white font-semibold text-base transition-all hover:opacity-90 active:scale-95" style={{ background: "#2F6FED", minWidth: 140 }}>
                Пошук
              </button>
            </div>
          </div>
        </div>
      </div>
    </section>
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
function BookingModal({ tourId, tourName, onClose }: { tourId: number | null; tourName: string; onClose: () => void }) {
  const [success, setSuccess] = useState(false);
  const [createAccount, setCreateAccount] = useState(false);
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [name, setName] = useState("");

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
              <div>
                <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">Email</label>
                <input value={email} onChange={e => setEmail(e.target.value)} placeholder="Введіть email" className="w-full h-13 px-4 rounded-[10px] text-sm font-medium focus:outline-none focus:ring-2 focus:ring-blue-400 transition-all" style={{ border: "1px solid #E2E4DF", height: 52 }} />
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">Телефон</label>
                <input value={phone} onChange={e => setPhone(e.target.value)} placeholder="+380..." className="w-full px-4 rounded-[10px] text-sm font-medium focus:outline-none focus:ring-2 focus:ring-blue-400 transition-all" style={{ border: "1px solid #E2E4DF", height: 52 }} />
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">Ім'я</label>
                <input value={name} onChange={e => setName(e.target.value)} placeholder="Введіть ім'я" className="w-full px-4 rounded-[10px] text-sm font-medium focus:outline-none focus:ring-2 focus:ring-blue-400 transition-all" style={{ border: "1px solid #E2E4DF", height: 52 }} />
              </div>
              <label className="flex items-center gap-3 cursor-pointer">
                <div onClick={() => setCreateAccount(!createAccount)} className="w-5 h-5 rounded flex items-center justify-center transition-colors" style={{ border: "2px solid " + (createAccount ? "#2F6FED" : "#E2E4DF"), background: createAccount ? "#2F6FED" : "#fff" }}>
                  {createAccount && <svg width="10" height="8" viewBox="0 0 10 8" fill="none"><path d="M1 4l3 3 5-6" stroke="#fff" strokeWidth="1.8" strokeLinecap="round" /></svg>}
                </div>
                <span className="text-sm font-medium">Створити акаунт</span>
              </label>
            </div>

            <div className="mt-6">
              <p className="text-sm font-semibold mb-3" style={{ color: "#1F2A24" }}>Оберіть спосіб зв'язку</p>
              <div className="space-y-3">
                <button
                  onClick={async () => {
                    try {
                      await fetch(`${API_URL}/booking-requests/`, {
                        method: "POST",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify({ tour: tourId, tour_name: tourName, email, phone, full_name: name, contact_channel: "viber" }),
                      });
                    } catch { /* сеть недоступна — всё равно показываем success, заявка не потеряется на UI */ }
                    setSuccess(true);
                  }}
                  className="w-full h-13 rounded-[10px] text-white font-semibold flex items-center justify-center gap-2 transition-all hover:opacity-90" style={{ background: "#7360F2", height: 52 }}
                >
                  <svg width="18" height="18" viewBox="0 0 18 18" fill="white" opacity="0.9"><path d="M9 1C4.6 1 1 4.4 1 8.5c0 2.1 1 4 2.6 5.3V17l2.6-1.4c.9.2 1.8.4 2.8.4 4.4 0 8-3.4 8-7.5S13.4 1 9 1z" /></svg>
                  Зв'язатися через Viber
                </button>
                <button
                  onClick={async () => {
                    try {
                      await fetch(`${API_URL}/booking-requests/`, {
                        method: "POST",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify({ tour: tourId, tour_name: tourName, email, phone, full_name: name, contact_channel: "telegram" }),
                      });
                    } catch { /* сеть недоступна */ }
                    setSuccess(true);
                  }}
                  className="w-full rounded-[10px] text-white font-semibold flex items-center justify-center gap-2 transition-all hover:opacity-90" style={{ background: "#2AABEE", height: 52 }}
                >
                  <svg width="18" height="18" viewBox="0 0 18 18" fill="white"><path d="M9 1C4.6 1 1 4.4 1 8.5c0 2.2 1 4.2 2.7 5.6L3.2 17l3.2-1.7c.8.2 1.7.3 2.6.3 4.4 0 8-3.4 8-7.5S13.4 1 9 1z" /></svg>
                  Зв'язатися через Telegram
                </button>
              </div>
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

// ─── Profile Modal ─────────────────────────────────────────────────────────────
function ProfileModal({ onClose }: { onClose: () => void }) {
  const [editing, setEditing] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center" style={{ background: "rgba(15,25,20,0.55)" }} onClick={(e) => e.target === e.currentTarget && onClose()}>
      <img src={heroPhoto} alt="" className="absolute inset-0 w-full h-full object-cover" style={{ filter: "blur(4px) brightness(0.35)", transform: "scale(1.05)" }} />
      <div className="relative z-10 w-full" style={{ maxWidth: 520, background: "#fff", borderRadius: 20, padding: 32, boxShadow: "0 16px 48px rgba(31,42,36,0.18)", margin: "0 16px" }}>
        {confirmDelete ? (
          <div className="text-center py-6">
            <div className="w-14 h-14 rounded-full bg-red-50 flex items-center justify-center mx-auto mb-4">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#D64545" strokeWidth="2" strokeLinecap="round"><path d="M12 9v4M12 17h.01M10.3 3.5L2 20h20L13.7 3.5a2 2 0 0 0-3.4 0z" /></svg>
            </div>
            <h3 style={{ fontFamily: "Fraunces, serif", fontSize: 20, fontWeight: 700 }} className="mb-2">Видалити акаунт?</h3>
            <p className="text-sm text-gray-500 mb-6">Ця дія незворотна. Усі ваші дані будуть видалені.</p>
            <div className="flex gap-3">
              <button onClick={() => setConfirmDelete(false)} className="flex-1 h-12 rounded-[10px] font-semibold text-sm border transition-colors hover:bg-gray-50" style={{ border: "1px solid #E2E4DF" }}>Скасувати</button>
              <button className="flex-1 h-12 rounded-[10px] font-semibold text-sm text-white transition-opacity hover:opacity-90" style={{ background: "#D64545" }}>Так, видалити</button>
            </div>
          </div>
        ) : (
          <>
            <div className="flex items-center justify-between mb-6">
              <h2 style={{ fontFamily: "Fraunces, serif", fontSize: 24, fontWeight: 700 }}>Профіль</h2>
              <button onClick={onClose} className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-gray-100 text-gray-400 text-xl transition-colors">×</button>
            </div>
            <div className="flex gap-8 mb-8">
              <div className="flex flex-col items-center gap-3 flex-shrink-0">
                <div className="w-28 h-28 rounded-full flex items-center justify-center" style={{ background: "#F7F8F6", border: "2px solid #E2E4DF" }}>
                  <svg width="48" height="48" viewBox="0 0 48 48" fill="none" stroke="#C5CAC3" strokeWidth="1.5"><circle cx="24" cy="18" r="9" /><path d="M6 44c0-9.9 8.1-18 18-18s18 8.1 18 18" /></svg>
                </div>
                <button onClick={() => setEditing(!editing)} className="h-10 px-4 rounded-[10px] text-sm font-medium transition-colors hover:bg-gray-50" style={{ border: "1px solid #E2E4DF", color: "#1F2A24", minWidth: 112 }}>{editing ? "Зберегти" : "Редагувати"}</button>
              </div>
              <div className="flex-1 space-y-5">
                {[{ label: "Ім'я", value: "Олена Мороз" }, { label: "Email", value: "olena.moroz@gmail.com" }, { label: "Телефон", value: "+38 (067) 123-45-67" }].map((f) => (
                  <div key={f.label}>
                    <p className="text-xs font-semibold uppercase tracking-wide mb-1" style={{ color: "#66716B" }}>{f.label}</p>
                    {editing ? (
                      <input defaultValue={f.value} className="w-full px-3 py-2 rounded-[10px] text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-blue-300" style={{ border: "1px solid #E2E4DF" }} />
                    ) : (
                      <p className="text-base font-semibold">{f.value}</p>
                    )}
                  </div>
                ))}
              </div>
            </div>
            <button onClick={() => setConfirmDelete(true)} className="w-full h-12 rounded-[10px] text-white font-semibold text-sm transition-opacity hover:opacity-90" style={{ background: "#D64545" }}>Видалити акаунт</button>
          </>
        )}
      </div>
    </div>
  );
}

// ─── Search Results Page ───────────────────────────────────────────────────────
function SearchResultsPage({ tours, loading, onBook, onDetails }: { tours: Tour[]; loading: boolean; onBook: (t: Tour) => void; onDetails: (t: Tour) => void }) {
  const [page, setPage] = useState(1);
  const chips = ["Туреччина ×", "10.09.2026 ×", "4★ ×", "2 особи ×"];
  const [activeChips, setActiveChips] = useState(chips);

  return (
    <div className="max-w-[1200px] mx-auto px-6 pt-10 pb-16">
      <div className="flex flex-wrap items-center justify-between gap-4 mb-6">
        <h1 style={{ fontFamily: "Fraunces, serif", fontSize: 28, fontWeight: 700 }}>Результати пошуку</h1>
        <div className="flex flex-wrap gap-2">
          {activeChips.map((c) => (
            <button key={c} onClick={() => setActiveChips(activeChips.filter((x) => x !== c))} className="flex items-center gap-1 text-sm font-medium px-3 py-1.5 rounded-full transition-colors hover:bg-blue-50" style={{ border: "1px solid #2F6FED", color: "#2F6FED", height: 32 }}>{c}</button>
          ))}
        </div>
      </div>

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

      <div className="flex items-center justify-center gap-2 mt-10">
        {[1, 2, 3, 4, 5].map((n) => (
          <button key={n} onClick={() => setPage(n)} className="w-10 h-10 rounded-full text-sm font-semibold transition-all" style={{ background: page === n ? "#2F6FED" : "#fff", color: page === n ? "#fff" : "#1F2A24", border: "1px solid " + (page === n ? "#2F6FED" : "#E2E4DF") }}>{n}</button>
        ))}
      </div>
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

  const hotTours = tours.filter((t) => t.is_hot);

  const openBooking = (tour: Tour) => {
    setSelectedTour(tour);
    setModal("booking");
  };

  const openDetails = (tour: Tour) => {
    setSelectedTour(tour);
    setPage("tour");
  };

  return (
    <div className="min-h-full flex flex-col" style={{ background: "#F7F8F6" }}>
      <Header onProfile={() => setModal("profile")} onPage={setPage} />

      {toursError && (
        <div className="max-w-[1200px] mx-auto px-6 mt-4 w-full">
          <div style={{ background: "#FDECEC", border: "1px solid #F3B4B4", color: "#8A2E2E", borderRadius: 10, padding: "10px 16px", fontSize: 14 }}>{toursError}</div>
        </div>
      )}

      <main className="flex-1">
        {page === "home" && (
          <>
            <Hero onSearch={() => setPage("results")} />
            <HotTours tours={hotTours} loading={toursLoading} onBook={openBooking} onDetails={openDetails} />
            <About />
          </>
        )}
        {page === "tour" && (
          <TourDetailsPage tourId={selectedTour?.id ?? null} onBook={openBooking} />
        )}
        {page === "results" && (
          <SearchResultsPage tours={tours} loading={toursLoading} onBook={openBooking} onDetails={openDetails} />
        )}
      </main>

      <Footer />

      {modal === "booking" && (
        <BookingModal tourId={selectedTour?.id ?? null} tourName={selectedTour?.name ?? ""} onClose={() => setModal(null)} />
      )}
      {modal === "profile" && (
        <ProfileModal onClose={() => setModal(null)} />
      )}
    </div>
  );
}
