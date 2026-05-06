import { useCallback, useEffect, useMemo, useState } from "react";
import * as api from "../lib/api";

type Theme = "light" | "dark";
type Lang = "en" | "ar";
type Role = "user" | "admin";
type User = { id: number; name?: string; email: string; role: Role };

type TopClass = { name: string; prob: number };
type Prediction = {
  predicted_class: string;
  risk: "High" | "Medium" | "Low";
  confidence: number;
  top_classes: TopClass[];
  recommendation: string;
  is_ood: boolean;
};

type Page = "auth" | "home" | "admin" | "about";

function ThemeToggleIcon({ theme }: { theme: Theme }) {
  if (theme === "light") {
    return (
      <svg viewBox="0 0 24 24" aria-hidden="true" className="h-4 w-4">
        <path
          d="M21 12.8A9 9 0 1 1 11.2 3a7 7 0 1 0 9.8 9.8Z"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.8"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    );
  }
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" className="h-4 w-4">
      <circle cx="12" cy="12" r="4.2" fill="none" stroke="currentColor" strokeWidth="1.8" />
      <path
        d="M12 2.5v2.2M12 19.3v2.2M21.5 12h-2.2M4.7 12H2.5M18.8 5.2l-1.6 1.6M6.8 17.2l-1.6 1.6M18.8 18.8l-1.6-1.6M6.8 6.8 5.2 5.2"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
      />
    </svg>
  );
}

const t = {
  en: {
    nav: { appName: "UlcerVision", home: "Home", admin: "Admin", about: "About Us", signOut: "Sign out" },
    auth: {
      signIn: "Sign In",
      signUp: "Sign Up",
      fullName: "Full name",
      email: "Email",
      password: "Password",
      submitIn: "Sign in",
      submitUp: "Create account",
    },
    home: {
      uploadTitle: "DFU scan upload",
      uploadDesc: "Upload a plantar foot RGB image.",
      dragDrop: "Drag & drop DFU images",
      browse: "Click to browse files",
      remove: "Remove",
      run: "Run prediction",
      running: "Running prediction…",
      triage: "AI triage output",
      recent: "Recent scans",
      empty: "No scans yet.",
    },
    admin: { title: "Admin control plane" },
  },
  ar: {
    nav: { appName: "UlcerVision", home: "الرئيسية", admin: "الإدارة", about: "من نحن", signOut: "تسجيل الخروج" },
    auth: {
      signIn: "تسجيل الدخول",
      signUp: "إنشاء حساب",
      fullName: "الاسم الكامل",
      email: "البريد الإلكتروني",
      password: "كلمة المرور",
      submitIn: "دخول",
      submitUp: "إنشاء الحساب",
    },
    home: {
      uploadTitle: "رفع صورة القدم",
      uploadDesc: "ارفع صورة RGB لأسفل القدم.",
      dragDrop: "اسحب وأفلت صورة",
      browse: "انقر لاختيار ملف",
      remove: "إزالة",
      run: "تشغيل التوقع",
      running: "جاري التوقع…",
      triage: "نتيجة التصنيف",
      recent: "آخر الفحوصات",
      empty: "لا توجد فحوصات بعد.",
    },
    admin: { title: "لوحة الإدارة" },
  },
} as const;

function formatDateShort(date: string) {
  // SQLite CURRENT_TIMESTAMP is UTC but lacks the 'Z' suffix — append it so
  // the browser parses it as UTC and converts to local time automatically.
  const raw = date?.trim() || "";
  const iso = raw.endsWith("Z") || raw.includes("+") ? raw : raw.replace(" ", "T") + "Z";
  const d = new Date(iso);
  if (isNaN(d.getTime())) return raw;
  return d.toLocaleString("en-US", { month: "short", day: "2-digit", hour: "2-digit", minute: "2-digit" });
}

function Navbar({
  user,
  page,
  setPage,
  theme,
  setTheme,
  lang,
  setLang,
  onSignOut,
}: {
  user: User | null;
  page: Page;
  setPage: (p: Page) => void;
  theme: Theme;
  setTheme: (t: Theme) => void;
  lang: Lang;
  setLang: (l: Lang) => void;
  onSignOut: () => void;
}) {
  const [menuOpen, setMenuOpen] = useState(false);
  const tr = t[lang];

  return (
    <div className="sticky top-0 z-40 border-b border-govsa-green/20 bg-white/90 backdrop-blur-xl shadow-sm dark:border-dark-border dark:bg-dark-surface/90 dark:shadow-dark-card">
      <div className="mx-auto flex max-w-5xl items-center justify-between px-4 py-3">
        {/* Left: App Name */}
        <div className="flex w-1/4 items-center">
          <span className="text-sm font-bold uppercase tracking-[0.22em] text-govsa-green dark:text-dark-accent">
            {tr.nav.appName}
          </span>
        </div>

        {/* Center: Navigation Links */}
        <div className="flex flex-1 items-center justify-center gap-4">
          {user && (
            <>
              <button
                type="button"
                onClick={() => setPage("home")}
                className={`px-3 py-1 text-xs transition-all ${page === "home"
                    ? "font-bold text-govsa-green border-b-2 border-govsa-green dark:text-dark-accent dark:border-dark-accent"
                    : "text-textMuted hover:text-textPrimary dark:text-dark-text-secondary dark:hover:text-dark-text"
                  }`}
              >
                {tr.nav.home}
              </button>
              <button
                type="button"
                onClick={() => setPage("about")}
                className={`px-3 py-1 text-xs transition-all ${page === "about"
                    ? "font-bold text-govsa-green border-b-2 border-govsa-green dark:text-dark-accent dark:border-dark-accent"
                    : "text-textMuted hover:text-textPrimary dark:text-dark-text-secondary dark:hover:text-dark-text"
                  }`}
              >
                {tr.nav.about}
              </button>
              {user.role === "admin" && (
                <button
                  type="button"
                  onClick={() => setPage("admin")}
                  className={`px-3 py-1 text-xs transition-all ${page === "admin"
                      ? "font-bold text-govsa-green border-b-2 border-govsa-green dark:text-dark-accent dark:border-dark-accent"
                      : "text-textMuted hover:text-textPrimary dark:text-dark-text-secondary dark:hover:text-dark-text"
                    }`}
                >
                  {tr.nav.admin}
                </button>
              )}
            </>
          )}
        </div>
        {/* Right: Controls and User Dropdown */}
        <div className="flex w-1/4 items-center justify-end gap-3">
          <button
            type="button"
            onClick={() => setTheme(theme === "light" ? "dark" : "light")}
            className="inline-flex h-8 w-8 items-center justify-center rounded-full border border-borderSubtle bg-white text-textMuted transition hover:border-govsa-green/30 hover:text-govsa-green dark:border-dark-border dark:bg-dark-elevated dark:text-dark-text-secondary dark:hover:text-dark-accent dark:hover:border-dark-accent/30"
          >
            <ThemeToggleIcon theme={theme} />
          </button>

          <button
            type="button"
            onClick={() => setLang(lang === "en" ? "ar" : "en")}
            className="rounded-control border border-borderSubtle bg-white px-2 py-1 text-[10px] font-bold text-textPrimary transition hover:bg-bgmain dark:border-dark-border dark:bg-dark-elevated dark:text-dark-text-secondary dark:hover:text-dark-accent"
          >
            {lang === "en" ? "AR" : "EN"}
          </button>

          {user && (
            <div className="relative">
              <button
                type="button"
                onClick={() => setMenuOpen((v) => !v)}
                className="flex items-center gap-2 rounded-full border border-borderSubtle bg-white/90 px-3 py-1 text-xs transition hover:bg-bgmain dark:border-dark-border dark:bg-dark-elevated/90 dark:text-dark-text dark:hover:bg-dark-overlay"
              >
                <span className="max-w-[100px] truncate font-medium">{user.name || user.email}</span>
                <span className="text-[10px] opacity-50">▾</span>
              </button>
              {menuOpen && (
                <div className="absolute right-0 mt-2 w-40 overflow-hidden rounded-card border border-borderSubtle bg-white shadow-card dark:border-dark-border dark:bg-dark-elevated dark:shadow-dark-card">
                  <div className="border-b border-borderSubtle px-4 py-2 dark:border-dark-border">
                    <p className="text-[10px] font-bold uppercase tracking-wider text-govsa-green dark:text-dark-accent">
                      {user.role}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      setMenuOpen(false);
                      onSignOut();
                    }}
                    className="w-full px-4 py-2 text-left text-xs text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20"
                  >
                    {tr.nav.signOut}
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function AuthPage({ lang, onAuthed }: { lang: Lang; onAuthed: (u: User) => void }) {
  const tr = t[lang];
  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function submit() {
    setError(null);
    setBusy(true);
    try {
      const res =
        mode === "signup"
          ? await api.register({ name: name.trim() || undefined, email: email.trim(), password })
          : await api.login(email.trim(), password);
      onAuthed(res.user as User);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Request failed");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex min-h-[calc(100vh-60px)] items-center justify-center bg-bgmain px-4 py-10 text-textPrimary dark:bg-dark-base dark:text-dark-text">
      <div className="w-full max-w-md rounded-card border border-borderSubtle bg-white p-6 shadow-card dark:border-dark-border dark:bg-dark-surface dark:shadow-dark-card">
        <h1 className="text-center text-sm font-extrabold uppercase tracking-[0.28em] text-govsa-green dark:text-dark-accent">
          UlcerVision
        </h1>

        <div className="mt-4 inline-flex rounded-full border border-borderSubtle bg-bgmain p-1 dark:border-dark-border dark:bg-dark-elevated">
          <button
            type="button"
            onClick={() => setMode("signin")}
            className={`w-24 rounded-full px-3 py-1 text-[0.7rem] transition ${mode === "signin"
                ? "bg-govsa-green font-semibold text-white shadow-sm"
                : "text-textMuted hover:text-textPrimary dark:text-dark-text-secondary dark:hover:text-dark-text"
              }`}
          >
            {tr.auth.signIn}
          </button>
          <button
            type="button"
            onClick={() => setMode("signup")}
            className={`w-24 rounded-full px-3 py-1 text-[0.7rem] transition ${mode === "signup"
                ? "bg-govsa-green font-semibold text-white shadow-sm"
                : "text-textMuted hover:text-textPrimary dark:text-dark-text-secondary dark:hover:text-dark-text"
              }`}
          >
            {tr.auth.signUp}
          </button>
        </div>

        <div className="mt-4 space-y-3">
          {mode === "signup" && (
            <div>
              <label className="mb-1 block text-[0.72rem] font-medium text-textMuted dark:text-dark-text-secondary">
                {tr.auth.fullName}
              </label>
              <input
                className="w-full rounded-control border border-borderSubtle bg-white px-3 py-2 text-xs text-textPrimary outline-none transition focus:border-govsa-green focus:ring-1 focus:ring-govsa-green/30 dark:border-dark-border dark:bg-dark-elevated dark:text-dark-text dark:focus:border-dark-accent dark:focus:ring-dark-accent/20"
                value={name}
                onChange={(e) => setName(e.target.value)}
              />
            </div>
          )}
          <div>
            <label className="mb-1 block text-[0.72rem] font-medium text-textMuted dark:text-dark-text-secondary">
              {tr.auth.email}
            </label>
            <input
              className="w-full rounded-control border border-borderSubtle bg-white px-3 py-2 text-xs text-textPrimary outline-none transition focus:border-govsa-green focus:ring-1 focus:ring-govsa-green/30 dark:border-dark-border dark:bg-dark-elevated dark:text-dark-text dark:focus:border-dark-accent dark:focus:ring-dark-accent/20"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </div>
          <div>
            <label className="mb-1 block text-[0.72rem] font-medium text-textMuted dark:text-dark-text-secondary">
              {tr.auth.password}
            </label>
            <input
              className="w-full rounded-control border border-borderSubtle bg-white px-3 py-2 text-xs text-textPrimary outline-none transition focus:border-govsa-green focus:ring-1 focus:ring-govsa-green/30 dark:border-dark-border dark:bg-dark-elevated dark:text-dark-text dark:focus:border-dark-accent dark:focus:ring-dark-accent/20"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </div>

          {error && <p className="whitespace-pre-wrap text-[0.78rem] text-red-500 dark:text-red-400">{error}</p>}

          <button
            type="button"
            disabled={busy}
            onClick={submit}
            className="govsa-btn govsa-btn-primary mt-2 w-full disabled:opacity-60"
          >
            {busy ? "…" : mode === "signin" ? tr.auth.submitIn : tr.auth.submitUp}
          </button>
        </div>
      </div>
    </div>
  );
}

function HomePage({ lang, onUnauthorized }: { lang: Lang; onUnauthorized: () => void }) {
  const tr = t[lang];
  const [file, setFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [predicting, setPredicting] = useState(false);
  const [prediction, setPrediction] = useState<Prediction | null>(null);
  const [history, setHistory] = useState<api.ScanHistoryItem[]>([]);
  const [historyLoading, setHistoryLoading] = useState(true);

  const loadHistory = useCallback(() => {
    setHistoryLoading(true);
    api
      .scanHistory()
      .then(setHistory)
      .catch((e) => {
        if (e instanceof Error && e.message.includes("Unauthorized")) onUnauthorized();
      })
      .finally(() => setHistoryLoading(false));
  }, [onUnauthorized]);

  useEffect(() => {
    loadHistory();
  }, [loadHistory]);

  function handleFiles(files: FileList | null) {
    if (!files || files.length === 0) return;
    const f = files[0];
    setFile(f);
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    setPreviewUrl(URL.createObjectURL(f));
  }

  function clearFile() {
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    setFile(null);
    setPreviewUrl(null);
  }

  async function runPrediction() {
    if (!file || predicting) return;
    setPredicting(true);
    try {
      const res = await api.predict(file);
      setPrediction(res);
      loadHistory();
    } catch (e) {
      if (e instanceof Error && e.message.includes("Unauthorized")) onUnauthorized();
    } finally {
      setPredicting(false);
    }
  }

  const confidencePercent = prediction ? Math.round(prediction.confidence * 100) : 0;

  return (
    <main className="relative min-h-screen bg-bgmain dark:bg-dark-base">
      <div className="mx-auto max-w-3xl px-4 pb-16 pt-10">
        <div className="flex flex-col items-center gap-6">

          {/* ── Upload Card (centered & scaled up) ── */}
          <section className="w-full rounded-2xl border border-slate-200 bg-white p-8 shadow-lg dark:border-dark-border dark:bg-dark-surface dark:shadow-dark-card">
            <h2 className="text-center font-display text-base font-bold uppercase tracking-[0.22em] text-slate-900 dark:text-dark-text">
              {tr.home.uploadTitle}
            </h2>
            <p className="mt-2 text-center text-sm text-slate-500 dark:text-dark-text-muted">{tr.home.uploadDesc}</p>

            <label className="mt-5 flex cursor-pointer flex-col items-center justify-center rounded-2xl border-2 border-dashed border-slate-300 bg-slate-50 px-6 py-10 text-center transition hover:border-govsa-green/80 hover:bg-govsa-green/5 dark:border-dark-border-light dark:bg-dark-elevated dark:hover:border-dark-accent/40 dark:hover:bg-dark-accent-dim">
              <p className="text-lg font-semibold text-slate-900 dark:text-dark-text">{tr.home.dragDrop}</p>
              <span className="mt-2 inline-flex rounded-full border border-slate-300 bg-white px-4 py-1.5 text-xs font-medium text-slate-600 dark:border-dark-border dark:bg-dark-overlay dark:text-dark-text-secondary">
                {tr.home.browse}
              </span>
              <input type="file" accept="image/*" className="hidden" onChange={(e) => handleFiles(e.target.files)} />
            </label>

            {file && (
              <div className="mt-4 flex items-center gap-4">
                {previewUrl && (
                  <img src={previewUrl} alt="Preview" className="h-20 w-20 rounded-xl border border-slate-300 object-cover shadow-sm" />
                )}
                <div>
                  <p className="text-sm font-medium text-slate-900 dark:text-dark-text">{file.name}</p>
                  <button
                    type="button"
                    onClick={clearFile}
                    className="mt-1.5 inline-flex items-center rounded-full border border-slate-300 px-3 py-1 text-xs text-slate-700 hover:border-red-400 hover:bg-red-50 hover:text-red-700 dark:border-dark-border dark:text-dark-text-secondary dark:hover:border-red-500/40 dark:hover:bg-red-900/20 dark:hover:text-red-400"
                  >
                    ✕ {tr.home.remove}
                  </button>
                </div>
              </div>
            )}

            <div className="mt-6 flex justify-center">
              <button
                type="button"
                disabled={!file || predicting}
                onClick={runPrediction}
                className="govsa-btn govsa-btn-primary shadow-md hover:shadow-lg disabled:cursor-not-allowed disabled:opacity-60"
              >
                {predicting ? tr.home.running : tr.home.run}
              </button>
            </div>
          </section>

          {/* ── AI Triage Results ── */}
          <section className="w-full rounded-2xl border border-slate-200 bg-white p-8 shadow-lg dark:border-dark-border dark:bg-dark-surface dark:shadow-dark-card">
            <h2 className="text-center font-display text-base font-bold uppercase tracking-[0.22em] text-slate-900 dark:text-dark-text">
              {tr.home.triage}
            </h2>
            {prediction ? (
              prediction.predicted_class === "pending" ? (
                <div className="mx-auto mt-5 max-w-lg space-y-3 text-center">
                  <div className="inline-flex items-center gap-2 rounded-full border border-amber-300 bg-amber-50 px-4 py-2 dark:border-amber-500/30 dark:bg-amber-900/20">
                    <span className="text-lg">⚠️</span>
                    <span className="text-sm font-semibold text-amber-700 dark:text-amber-400">Analysis server unavailable</span>
                  </div>
                  <p className="text-sm text-slate-500 dark:text-dark-text-muted">
                    Your image was saved successfully. The AI model server is currently offline — please try again later or contact the administrator.
                  </p>
                </div>
              ) : prediction.is_ood ? (
                <div className="mx-auto mt-5 max-w-lg space-y-3 text-center">
                  <div className="inline-flex items-center gap-2 rounded-full border border-red-300 bg-red-50 px-4 py-2 dark:border-red-500/30 dark:bg-red-900/20">
                    <span className="text-lg">🚫</span>
                    <span className="text-sm font-semibold text-red-700 dark:text-red-400">Invalid image — not a DFU scan</span>
                  </div>
                  <p className="text-sm text-slate-500 dark:text-dark-text-muted">
                    The uploaded image does not appear to be a diabetic foot ulcer. Please upload a plantar foot RGB photograph for accurate analysis.
                  </p>
                </div>
              ) : (
                <div className="mx-auto mt-5 max-w-lg space-y-4 text-sm">
                  <p className="text-center text-lg text-slate-900 dark:text-dark-text">
                    Predicted: <span className="font-bold text-govsa-green dark:text-dark-accent">{prediction.predicted_class}</span>
                  </p>
                  <div className="h-3 w-full rounded-full border border-slate-200 bg-slate-100 dark:border-dark-border dark:bg-dark-elevated">
                    <div
                      className="h-full rounded-full bg-gradient-to-r from-govsa-green to-govsa-blue transition-all duration-500"
                      style={{ width: `${confidencePercent}%` }}
                    />
                  </div>
                  <p className="text-center text-base font-semibold text-slate-700 dark:text-dark-text-secondary">{confidencePercent}% confidence</p>
                  <p className="text-center text-sm leading-relaxed text-slate-600 dark:text-dark-text-muted">{prediction.recommendation}</p>
                </div>
              )
            ) : (
              <p className="mt-4 text-center text-sm text-slate-400 dark:text-dark-text-muted">
                Upload an image and run prediction to see results.
              </p>
            )}
          </section>

          {/* ── Recent Scans ── */}
          <section className="w-full rounded-2xl border border-slate-200 bg-white p-8 shadow-lg dark:border-dark-border dark:bg-dark-surface dark:shadow-dark-card">
            <h2 className="text-center font-display text-base font-bold uppercase tracking-[0.22em] text-slate-900 dark:text-dark-text">
              {tr.home.recent}
            </h2>
            {historyLoading ? (
              <p className="mt-4 text-center text-sm text-slate-500 dark:text-dark-text-muted">Loading…</p>
            ) : history.length === 0 ? (
              <p className="mt-4 text-center text-sm text-slate-500 dark:text-dark-text-muted">{tr.home.empty}</p>
            ) : (
              <div className="mt-5 space-y-2.5 text-sm">
                {history.map((h) => (
                  <div key={h.id} className="flex items-center gap-4 rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 transition hover:bg-slate-100 dark:border-dark-border dark:bg-dark-elevated dark:hover:bg-dark-overlay">
                    <div className="h-11 w-11 flex-shrink-0 rounded-lg border border-slate-200 bg-slate-200 dark:border-dark-border dark:bg-dark-overlay" />
                    <div className="min-w-0 flex-1">
                      <p className="truncate font-medium text-slate-900 dark:text-dark-text">{h.file_name}</p>
                      <p className="text-xs text-slate-500 dark:text-dark-text-muted">{formatDateShort(h.created_at)}</p>
                    </div>
                    <span className="flex-shrink-0 rounded-full border border-slate-300 bg-white px-3 py-1 text-xs font-semibold text-slate-700 dark:border-dark-border dark:bg-dark-overlay dark:text-dark-text-secondary">
                      {h.risk || "—"}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </section>

        </div>
      </div>
    </main>
  );
}

function AdminPage({ lang }: { lang: Lang }) {
  const tr = t[lang];
  const [tab, setTab] = useState<"dashboard" | "users" | "logs">("dashboard");
  const [stats, setStats] = useState<api.AdminStats | null>(null);
  const [users, setUsers] = useState<api.AdminUserOut[]>([]);
  const [logs, setLogs] = useState<any[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    let cancelled = false;
    setError(null);
    setLoading(true);
    const run = async () => {
      try {
        if (tab === "dashboard") {
          const s = await api.adminStats();
          if (!cancelled) setStats(s);
        } else if (tab === "users") {
          const u = await api.adminUsers();
          if (!cancelled) setUsers(u);
        } else if (tab === "logs") {
          const l = await api.adminLogs();
          if (!cancelled) setLogs(l);
        }
      } catch (e) {
        if (!cancelled) setError(e instanceof Error ? e.message : "Failed to load");
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    run();
    return () => {
      cancelled = true;
    };
  }, [tab]);

  return (
    <main className="min-h-screen bg-bgmain px-4 py-10 dark:bg-dark-base">
      <div className="mx-auto max-w-5xl">
        <div className="rounded-2xl border border-slate-200 bg-white p-6 dark:border-dark-border dark:bg-dark-surface shadow-xl dark:shadow-dark-card">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 pb-4 dark:border-dark-border">
            <h1 className="text-lg font-bold text-govsa-green dark:text-dark-accent">
              Admin Portal
            </h1>
            <div className="inline-flex rounded-full border border-slate-200 bg-slate-50 p-1 text-xs dark:border-dark-border dark:bg-dark-elevated">
              {(["dashboard", "users", "logs"] as const).map((k) => (
                <button
                  key={k}
                  type="button"
                  onClick={() => setTab(k)}
                  className={`rounded-full px-4 py-1.5 transition-all ${tab === k
                      ? "bg-govsa-green font-bold text-white shadow-md"
                      : "text-slate-500 hover:text-slate-900 dark:text-dark-text-muted dark:hover:text-dark-text"
                    }`}
                >
                  {k.charAt(0).toUpperCase() + k.slice(1)}
                </button>
              ))}
            </div>
          </div>

          {error && <p className="mt-4 rounded-lg bg-red-50 p-3 text-sm text-red-600 dark:bg-red-900/20 dark:text-red-400">{error}</p>}
          {loading && <div className="py-10 text-center text-slate-400 animate-pulse">Loading data...</div>}

          {!loading && tab === "dashboard" && stats && (
            <div className="mt-6 grid gap-4 md:grid-cols-3">
              <div className="rounded-2xl border border-slate-100 bg-white p-6 shadow-sm dark:border-dark-border dark:bg-dark-elevated">
                <p className="text-xs font-bold uppercase tracking-wider text-slate-400">Total Users</p>
                <p className="mt-2 text-3xl font-black text-slate-900 dark:text-white">{stats.totalUsers}</p>
              </div>
              <div className="rounded-2xl border border-slate-100 bg-white p-6 shadow-sm dark:border-dark-border dark:bg-dark-elevated">
                <p className="text-xs font-bold uppercase tracking-wider text-slate-400">Total Scans</p>
                <p className="mt-2 text-3xl font-black text-slate-900 dark:text-white">{stats.totalScans}</p>
              </div>
              <div className="rounded-2xl border border-slate-100 bg-white p-6 shadow-sm dark:border-dark-border dark:bg-dark-elevated">
                <p className="text-xs font-bold uppercase tracking-wider text-slate-400">Success Rate</p>
                <p className="mt-2 text-3xl font-black text-govsa-green dark:text-dark-accent">
                  {stats.totalScans > 0 ? Math.round((stats.scansProcessed / stats.totalScans) * 100) : 0}%
                </p>
              </div>

              <div className="md:col-span-3 rounded-2xl border border-slate-100 bg-white p-6 shadow-sm dark:border-dark-border dark:bg-dark-elevated">
                <p className="text-sm font-bold text-slate-900 dark:text-white mb-4">Diagnosis Distribution</p>
                <div className="grid gap-3 sm:grid-cols-4">
                  {(["none", "infection", "ischemia", "both"] as const).map((k) => (
                    <div key={k} className="rounded-xl bg-slate-50 p-4 dark:bg-dark-overlay">
                      <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">{k}</p>
                      <p className="mt-1 text-xl font-bold text-slate-900 dark:text-white">{stats.predictionCounts?.[k] ?? 0}</p>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {!loading && tab === "users" && (
            <div className="mt-6 overflow-hidden rounded-xl border border-slate-100 dark:border-dark-border">
              <table className="w-full text-left text-sm">
                <thead className="bg-slate-50 text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:bg-dark-elevated dark:text-dark-text-muted">
                  <tr>
                    <th className="px-6 py-4">Name</th>
                    <th className="px-6 py-4">Email</th>
                    <th className="px-6 py-4">Role</th>
                    <th className="px-6 py-4">Scans</th>
                    <th className="px-6 py-4">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-dark-border">
                  {users.map((u) => (
                    <tr key={u.id} className="hover:bg-slate-50/50 dark:hover:bg-dark-elevated/50 transition-colors">
                      <td className="px-6 py-4 font-medium dark:text-white">{u.name || "—"}</td>
                      <td className="px-6 py-4 text-slate-500 dark:text-dark-text-secondary">{u.email}</td>
                      <td className="px-6 py-4">
                        <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold uppercase ${u.role === "admin" ? "bg-amber-100 text-amber-700" : "bg-blue-100 text-blue-700"
                          }`}>
                          {u.role}
                        </span>
                      </td>
                      <td className="px-6 py-4 font-mono">{u.scan_count}</td>
                      <td className="px-6 py-4">
                        <button
                          type="button"
                          onClick={async () => {
                            if (!confirm("Are you sure?")) return;
                            try {
                              await api.deleteAdminUser(u.id);
                              setUsers((prev) => prev.filter((x) => x.id !== u.id));
                            } catch (e) {
                              setError(e instanceof Error ? e.message : "Failed to delete");
                            }
                          }}
                          className="text-red-500 hover:text-red-700 font-bold transition-colors"
                        >
                          Delete
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {!loading && tab === "logs" && (
            <div className="mt-6 space-y-4">
              <div className="overflow-hidden rounded-xl border border-slate-100 dark:border-dark-border">
                <table className="w-full text-left text-sm">
                  <thead className="bg-slate-50 text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:bg-dark-elevated dark:text-dark-text-muted">
                    <tr>
                      <th className="px-6 py-4">Scan ID</th>
                      <th className="px-6 py-4">User</th>
                      <th className="px-6 py-4">Prediction</th>
                      <th className="px-6 py-4">Confidence</th>
                      <th className="px-6 py-4">Date</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-dark-border">
                    {logs.map((log) => (
                      <tr key={log.scan_id} className="hover:bg-slate-50/50 dark:hover:bg-dark-elevated/50 transition-colors">
                        <td className="px-6 py-4 font-mono text-xs">#{log.scan_id}</td>
                        <td className="px-6 py-4">
                          <div className="flex flex-col">
                            <span className="font-medium dark:text-white">{log.user_name}</span>
                            <span className="text-[10px] text-slate-400">{log.user_email}</span>
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold uppercase ${log.prediction === "none" ? "bg-slate-100 text-slate-600" : "bg-red-100 text-red-700"
                            }`}>
                            {log.prediction || "pending"}
                          </span>
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-2">
                            <div className="h-1.5 w-12 rounded-full bg-slate-100 dark:bg-dark-overlay">
                              <div
                                className="h-full rounded-full bg-govsa-green"
                                style={{ width: `${(log.confidence || 0) * 100}%` }}
                              />
                            </div>
                            <span className="text-xs font-mono">{Math.round((log.confidence || 0) * 100)}%</span>
                          </div>
                        </td>
                        <td className="px-6 py-4 text-xs text-slate-500 dark:text-dark-text-muted">
                          {formatDateShort(log.uploaded_at)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      </div>
    </main>
  );
}

function AboutPage({ lang }: { lang: Lang }) {
  const isAr = lang === "ar";
  return (
    <main className="min-h-screen bg-white px-4 py-20 dark:bg-dark-base">
      <div className="mx-auto max-w-3xl text-center">
        <h1 className="text-4xl font-black text-govsa-green dark:text-dark-accent mb-6">
          {isAr ? "عن UlcerVision" : "About UlcerVision"}
        </h1>
        <div className="space-y-6 text-lg text-slate-600 dark:text-dark-text-secondary leading-relaxed">
          <p>
            {isAr
              ? "UlcerVision هو نظام متقدم مدعوم بالذكاء الاصطناعي مصمم لمساعدة المتخصصين في الرعاية الصحية في الكشف المبكر وتصنيف قرح القدم السكري (DFU)."
              : "UlcerVision is an advanced AI-powered system designed to assist healthcare professionals in the early detection and classification of Diabetic Foot Ulcers (DFU)."}
          </p>
          <p>
            {isAr
              ? "تستخدم تقنيتنا نماذج التعلم العميق المتطورة لتحليل صور القدم وتحديد المخاطر المحتملة مثل العدوى ونقص التروية، مما يساعد في توفير الرعاية المناسبة في الوقت المناسب."
              : "Our technology utilizes cutting-edge deep learning models to analyze foot images and identify potential risks such as infection and ischemia, helping to provide the right care at the right time."}
          </p>
          <div className="pt-10 grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="p-6 rounded-2xl bg-white dark:bg-dark-surface shadow-xl dark:shadow-dark-card border border-slate-100 dark:border-dark-border">
              <div className="text-3xl mb-4">🚀</div>
              <h3 className="font-bold text-slate-900 dark:text-white mb-2">{isAr ? "سرعة" : "Speed"}</h3>
              <p className="text-sm">{isAr ? "نتائج فورية في ثوانٍ معدودة." : "Instant results in just seconds."}</p>
            </div>
            <div className="p-6 rounded-2xl bg-white dark:bg-dark-surface shadow-xl dark:shadow-dark-card border border-slate-100 dark:border-dark-border">
              <div className="text-3xl mb-4">🎯</div>
              <h3 className="font-bold text-slate-900 dark:text-white mb-2">{isAr ? "دقة" : "Accuracy"}</h3>
              <p className="text-sm">{isAr ? "تحليل دقيق يعتمد على آلاف الحالات." : "Precise analysis based on thousands of cases."}</p>
            </div>
            <div className="p-6 rounded-2xl bg-white dark:bg-dark-surface shadow-xl dark:shadow-dark-card border border-slate-100 dark:border-dark-border">
              <div className="text-3xl mb-4">🛡️</div>
              <h3 className="font-bold text-slate-900 dark:text-white mb-2">{isAr ? "أمان" : "Safety"}</h3>
              <p className="text-sm">{isAr ? "حماية تامة لبيانات المرضى." : "Full protection for patient data."}</p>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}

export default function IndexPage() {
  const [user, setUser] = useState<User | null>(null);
  const [page, setPage] = useState<Page>("auth");
  const [theme, setTheme] = useState<Theme>("light");
  const [lang, setLang] = useState<Lang>("en");

  useEffect(() => {
    const saved = window.localStorage.getItem("theme");
    if (saved === "light" || saved === "dark") {
      setTheme(saved);
      return;
    }
    const prefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
    setTheme(prefersDark ? "dark" : "light");
  }, []);

  useEffect(() => {
    const root = document.documentElement;
    if (theme === "dark") root.classList.add("dark");
    else root.classList.remove("dark");
    window.localStorage.setItem("theme", theme);
  }, [theme]);

  useEffect(() => {
    document.documentElement.lang = lang === "ar" ? "ar" : "en";
  }, [lang]);

  useEffect(() => {
    api
      .me()
      .then((u) => {
        setUser(u as User);
        setPage("home");
      })
      .catch(() => { });
  }, []);

  const safeSetPage = useCallback(
    (p: Page) => {
      if (p === "admin" && user?.role !== "admin") return;
      setPage(p);
    },
    [user]
  );

  const onSignOut = useCallback(() => {
    api.logout().catch(() => { });
    setUser(null);
    setPage("auth");
  }, []);

  const onUnauthorized = useCallback(() => {
    onSignOut();
  }, [onSignOut]);

  const content = useMemo(() => {
    if (!user || page === "auth") return <AuthPage lang={lang} onAuthed={(u) => { setUser(u); setPage("home"); }} />;
    if (page === "admin") return <AdminPage lang={lang} />;
    if (page === "about") return <AboutPage lang={lang} />;
    return <HomePage lang={lang} onUnauthorized={onUnauthorized} />;
  }, [user, page, lang, onUnauthorized]);

  return (
    <div className="flex min-h-screen flex-col bg-bgmain dark:bg-dark-base">
      <Navbar user={user} page={page} setPage={safeSetPage} theme={theme} setTheme={setTheme} lang={lang} setLang={setLang} onSignOut={onSignOut} />
      {content}
    </div>
  );
}

