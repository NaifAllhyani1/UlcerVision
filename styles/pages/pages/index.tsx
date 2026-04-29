import { useState } from "react";

type Role = "admin" | "user";
type User = { name?: string; email: string; role: Role };

type TopClass = { name: string; prob: number };
type Prediction = {
  predicted_class: string;
  risk: "High" | "Medium" | "Low";
  confidence: number;
  top_classes: TopClass[];
  recommendation: string;
};

type Page = "auth" | "home" | "admin";

function simulatePredict(): Promise<Prediction> {
  return new Promise((resolve) => {
    setTimeout(() => {
      const riskLevels: Prediction["risk"][] = ["High", "Medium", "Low"];
      const riskWeights = [0.4, 0.35, 0.25];
      const r = Math.random();
      let cumulative = 0;
      let selectedRisk: Prediction["risk"] = "High";
      for (let i = 0; i < riskLevels.length; i++) {
        cumulative += riskWeights[i];
        if (r <= cumulative) {
          selectedRisk = riskLevels[i];
          break;
        }
      }

      const classes = [
        "Neuropathic DFU",
        "Ischemic DFU",
        "Neuroischemic DFU",
        "Healed Scar",
        "Healthy Plantar Skin"
      ];
      const shuffled = [...classes].sort(() => Math.random() - 0.5);
      const selected = shuffled.slice(0, 4);

      let remaining = 1;
      const probs = selected.map((_, idx) => {
        if (idx === selected.length - 1) return remaining;
        const max = remaining - (selected.length - idx - 1) * 0.08;
        const min = 0.08;
        const val = Math.max(min, Math.min(max, Math.random() * 0.3 + 0.1));
        remaining -= val;
        return val;
      });

      const ordered = selected
        .map((name, i) => ({ name, prob: probs[i] }))
        .sort((a, b) => b.prob - a.prob);

      const predicted_class = ordered[0].name;
      const confidence = Math.max(0.6, Math.min(0.98, ordered[0].prob + 0.3));

      const recommendationByRisk: Record<Prediction["risk"], string> = {
        High:
          "Urgent referral to multidisciplinary foot team within 24 hours. Offload pressure, optimize glycemic control, and consider imaging for osteomyelitis.",
        Medium:
          "Schedule podiatry review within 1 week. Offload high‑pressure areas, inspect daily for progression, and adjust footwear or orthotics.",
        Low:
          "Continue routine foot surveillance, moisturize intact skin, and educate the patient to report any new redness, warmth, or callus."
      };

      resolve({
        predicted_class,
        risk: selectedRisk,
        confidence,
        top_classes: ordered,
        recommendation: recommendationByRisk[selectedRisk]
      });
    }, 2200);
  });
}

function formatDateShort(date: Date) {
  return date.toLocaleString("en-US", {
    month: "short",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit"
  });
}

type HistoryItem = {
  id: number;
  name: string;
  date: string;
  risk: Prediction["risk"];
  thumbnail?: string | null;
};

function Navbar({
  user,
  currentPage,
  setCurrentPage,
  onSignOut
}: {
  user: User | null;
  currentPage: Page;
  setCurrentPage: (p: Page) => void;
  onSignOut: () => void;
}) {
  return (
    <div className="sticky top-0 z-40 border-b border-slate-800/80 bg-slate-950/80 backdrop-blur-xl shadow-[0_14px_45px_rgba(15,23,42,0.9)]">
      <div className="mx-auto flex max-w-5xl items-center justify-between px-4 py-3">
        <div className="flex items-center space-x-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-full bg-[conic-gradient(from_210deg,#00c9a7,#38bdf8,#f97316,#fbbf24,#00c9a7)] shadow-[0_0_18px_rgba(56,189,248,0.9)]">
            <span className="text-xl drop-shadow-[0_0_6px_rgba(15,23,42,1)]">
              🦶
            </span>
          </div>
          <div className="flex flex-col">
            <span className="font-display text-xs font-semibold uppercase tracking-[0.22em]">
              DFU Predict
            </span>
            <span className="text-xs text-slate-400">
              AI triage for diabetic foot ulcers
            </span>
          </div>
        </div>
        <div className="flex items-center space-x-2">
          {user && (
            <>
              <button
                className={`rounded-full border border-transparent px-3 py-1 text-xs transition ${
                  currentPage === "home"
                    ? "bg-gradient-to-r from-accentPrimary to-accentSecondary font-semibold text-slate-950 shadow-lg"
                    : "bg-transparent text-slate-400 hover:-translate-y-[1px] hover:border-sky-500/60 hover:bg-slate-900/80 hover:text-slate-100"
                }`}
                onClick={() => setCurrentPage("home")}
              >
                Home
              </button>
              {user.role === "admin" && (
                <button
                  className={`rounded-full border border-transparent px-3 py-1 text-xs transition ${
                    currentPage === "admin"
                      ? "bg-gradient-to-r from-accentPrimary to-accentSecondary font-semibold text-slate-950 shadow-lg"
                      : "bg-transparent text-slate-400 hover:-translate-y-[1px] hover:border-sky-500/60 hover:bg-slate-900/80 hover:text-slate-100"
                  }`}
                  onClick={() => setCurrentPage("admin")}
                >
                  Admin
                </button>
              )}
              <div className="flex items-center rounded-full border border-slate-600/60 px-3 py-1 text-xs text-slate-300">
                <span>{user.name || user.email}</span>
                <span className="ml-2 rounded-full border border-slate-500/70 bg-slate-950 px-2 py-0.5 text-[0.6rem] uppercase tracking-[0.16em] text-slate-300">
                  {user.role}
                </span>
              </div>
              <button
                onClick={onSignOut}
                className="ml-2 rounded-full border border-red-500/70 px-3 py-1 text-xs text-red-200 transition hover:-translate-y-[1px] hover:bg-red-900/80"
              >
                Sign out
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

function AuthPage({ onAuthenticated }: { onAuthenticated: (u: User) => void }) {
  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [errors, setErrors] = useState<Record<string, string>>({});

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const nextErrors: Record<string, string> = {};
    if (mode === "signup" && !name.trim()) {
      nextErrors.name = "Name is required.";
    }
    if (!email.trim()) {
      nextErrors.email = "Email is required.";
    }
    if (!password.trim()) {
      nextErrors.password = "Password is required.";
    }
    setErrors(nextErrors);
    if (Object.keys(nextErrors).length > 0) return;

    const role: Role = email.toLowerCase().includes("admin") ? "admin" : "user";
    onAuthenticated({
      name: mode === "signup" ? name.trim() : undefined,
      email: email.trim(),
      role
    });
  }

  function switchMode(next: "signin" | "signup") {
    setMode(next);
    setErrors({});
  }

  return (
    <div className="flex min-h-[calc(100vh-60px)] items-center justify-center px-4 py-10">
      <div className="relative w-full max-w-md animate-fadeUp rounded-2xl border border-slate-800/80 bg-slate-950/95 p-6 shadow-[0_22px_50px_rgba(15,23,42,1)]">
        <div className="absolute inset-0 -z-10 rounded-2xl bg-[radial-gradient(circle_at_0_0,rgba(56,189,248,0.22),transparent_55%),radial-gradient(circle_at_100%_100%,rgba(0,201,167,0.18),transparent_55%)]" />
        <div className="mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-3xl bg-[conic-gradient(from_210deg,#00c9a7,#38bdf8,#f97316,#fbbf24,#00c9a7)] shadow-[0_0_24px_rgba(56,189,248,0.9)]">
          <span className="text-3xl drop-shadow-[0_0_10px_rgba(15,23,42,1)]">
            🦶
          </span>
        </div>
        <h1 className="text-center font-display text-xs font-extrabold uppercase tracking-[0.28em] text-slate-100">
          DFU Predict
        </h1>
        <p className="mt-1 text-center text-xs text-slate-400">
          Deep-learning triage support for diabetic foot ulcers.
        </p>

        <div className="mt-4 inline-flex rounded-full border border-slate-700/90 bg-slate-950/80 p-1">
          <button
            type="button"
            onClick={() => switchMode("signin")}
            className={`w-24 rounded-full px-3 py-1 text-[0.7rem] transition ${
              mode === "signin"
                ? "bg-gradient-to-r from-accentPrimary to-accentSecondary font-semibold text-slate-950 shadow-lg"
                : "text-slate-400 hover:text-slate-100"
            }`}
          >
            Sign In
          </button>
          <button
            type="button"
            onClick={() => switchMode("signup")}
            className={`w-24 rounded-full px-3 py-1 text-[0.7rem] transition ${
              mode === "signup"
                ? "bg-gradient-to-r from-accentPrimary to-accentSecondary font-semibold text-slate-950 shadow-lg"
                : "text-slate-400 hover:text-slate-100"
            }`}
          >
            Sign Up
          </button>
        </div>

        <form onSubmit={handleSubmit} className="mt-4 space-y-3" noValidate>
          {mode === "signup" && (
            <div>
              <label className="mb-1 block text-[0.72rem] font-medium text-slate-400">
                Full name
              </label>
              <input
                className="w-full rounded-lg border border-slate-700 bg-slate-950/80 px-3 py-2 text-xs text-slate-100 outline-none transition focus:border-accentSecondary focus:ring-1 focus:ring-accentSecondary"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Dr. Jane Doe"
              />
              {errors.name && (
                <p className="mt-1 text-[0.7rem] text-red-300">{errors.name}</p>
              )}
            </div>
          )}
          <div>
            <label className="mb-1 block text-[0.72rem] font-medium text-slate-400">
              Work email
            </label>
            <input
              className="w-full rounded-lg border border-slate-700 bg-slate-950/80 px-3 py-2 text-xs text-slate-100 outline-none transition focus:border-accentSecondary focus:ring-1 focus:ring-accentSecondary"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@hospital.org"
            />
            {errors.email && (
              <p className="mt-1 text-[0.7rem] text-red-300">{errors.email}</p>
            )}
          </div>
          <div>
            <label className="mb-1 block text-[0.72rem] font-medium text-slate-400">
              Password
            </label>
            <input
              className="w-full rounded-lg border border-slate-700 bg-slate-950/80 px-3 py-2 text-xs text-slate-100 outline-none transition focus:border-accentSecondary focus:ring-1 focus:ring-accentSecondary"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
            />
            {errors.password && (
              <p className="mt-1 text-[0.7rem] text-red-300">
                {errors.password}
              </p>
            )}
          </div>
          <button
            type="submit"
            className="mt-3 w-full rounded-full bg-gradient-to-r from-accentPrimary to-accentSecondary py-2 text-[0.78rem] font-semibold uppercase tracking-[0.18em] text-slate-950 shadow-[0_18px_35px_rgba(15,23,42,1)] transition hover:-translate-y-[1px] hover:brightness-105 active:translate-y-0"
          >
            {mode === "signin" ? "Sign in" : "Create account"}
          </button>
        </form>
      </div>
    </div>
  );
}

function HomePage({ user }: { user: User }) {
  const [file, setFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [dragging, setDragging] = useState(false);
  const [predicting, setPredicting] = useState(false);
  const [prediction, setPrediction] = useState<Prediction | null>(null);
  const [history, setHistory] = useState<HistoryItem[]>([]);

  function handleFiles(files: FileList | null) {
    if (!files || files.length === 0) return;
    const f = files[0];
    setFile(f);
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    const url = URL.createObjectURL(f);
    setPreviewUrl(url);
  }

  function onDrop(e: React.DragEvent<HTMLLabelElement>) {
    e.preventDefault();
    e.stopPropagation();
    setDragging(false);
    handleFiles(e.dataTransfer.files);
  }

  function onDragOver(e: React.DragEvent<HTMLLabelElement>) {
    e.preventDefault();
    e.stopPropagation();
    setDragging(true);
  }

  function onDragLeave(e: React.DragEvent<HTMLLabelElement>) {
    e.preventDefault();
    e.stopPropagation();
    setDragging(false);
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
      const res = await simulatePredict();
      setPrediction(res);
      const now = new Date();
      setHistory((prev) => [
        {
          id: now.getTime(),
          name: file.name || "DFU scan",
          date: formatDateShort(now),
          risk: res.risk,
          thumbnail: previewUrl
        },
        ...prev
      ]);
    } finally {
      setPredicting(false);
    }
  }

  const confidencePercent = prediction
    ? Math.round(prediction.confidence * 100)
    : 0;

  const riskClasses: Record<Prediction["risk"], string> = {
    High:
      "bg-red-500/10 border-red-500/80 text-red-100 flex items-center space-x-1 rounded-full px-3 py-1 text-[0.7rem]",
    Medium:
      "bg-amber-500/10 border-amber-400/80 text-amber-50 flex items-center space-x-1 rounded-full px-3 py-1 text-[0.7rem]",
    Low:
      "bg-emerald-500/10 border-emerald-400/80 text-emerald-50 flex items-center space-x-1 rounded-full px-3 py-1 text-[0.7rem]"
  };

  function riskDotColor(r: Prediction["risk"]) {
    if (r === "High") return "bg-red-400";
    if (r === "Medium") return "bg-amber-300";
    return "bg-emerald-300";
  }

  return (
    <main className="relative min-h-screen bg-bgmain">
      <div className="pointer-events-none fixed inset-0 -z-10 bg-[radial-gradient(circle_at_10%_20%,rgba(0,201,167,0.18),transparent_55%),radial-gradient(circle_at_80%_0%,rgba(56,189,248,0.18),transparent_55%),radial-gradient(circle_at_50%_100%,rgba(59,130,246,0.16),transparent_55%)]" />
      <div className="mx-auto max-w-5xl px-4 pb-10 pt-10">
        <div className="grid gap-4 md:grid-cols-[2fr,1.25fr]">
          {/* Left stack */}
          <div className="space-y-4">
            <section className="relative animate-fadeUp rounded-2xl border border-slate-800/80 bg-slate-950/95 p-5 shadow-[0_18px_40px_rgba(15,23,42,1)]">
              <div className="absolute inset-0 -z-10 rounded-2xl bg-[radial-gradient(circle_at_0_0,rgba(56,189,248,0.18),transparent_55%),radial-gradient(circle_at_100%_100%,rgba(0,201,167,0.16),transparent_55%)]" />
              <div className="flex items-start justify-between gap-3">
                <div>
                  <h2 className="font-display text-[0.78rem] font-semibold uppercase tracking-[0.18em]">
                    DFU scan upload
                  </h2>
                  <p className="mt-1 text-[0.78rem] text-slate-400">
                    Upload a plantar foot RGB image. We simulate a Swin
                    transformer DFU model for demo.
                  </p>
                </div>
                <span className="inline-flex items-center space-x-1 rounded-full border border-slate-600/70 bg-slate-950 px-3 py-1 text-[0.7rem] text-slate-300">
                  <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 shadow-[0_0_10px_rgba(16,185,129,1)]" />
                  <span>Realtime mock inference</span>
                </span>
              </div>

              <label
                className={`mt-3 flex cursor-pointer flex-col items-center justify-center rounded-xl border border-dashed border-slate-600/80 bg-slate-950/90 px-4 py-6 text-center text-xs transition ${
                  dragging
                    ? "border-sky-400 bg-slate-950 shadow-[0_18px_45px_rgba(15,23,42,1)]"
                    : "hover:border-sky-400/75 hover:bg-slate-900"
                }`}
                onDrop={onDrop}
                onDragOver={onDragOver}
                onDragLeave={onDragLeave}
              >
                <div className="mb-2 flex h-10 w-10 items-center justify-center rounded-full border border-slate-600/80 bg-slate-950 text-sky-300">
                  ⬆
                </div>
                <p className="text-[0.86rem] font-medium text-slate-100">
                  Drag &amp; drop DFU images
                </p>
                <p className="mt-1 text-[0.75rem] text-slate-400">
                  DICOM export, PNG, or JPEG • Ideal 224×224–512×512
                </p>
                <span className="mt-1 inline-flex rounded-full border border-slate-600/80 px-3 py-1 text-[0.7rem] text-slate-300">
                  Click to browse files
                </span>
                <input
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={(e) => handleFiles(e.target.files)}
                />
              </label>

              {file && (
                <div className="mt-3 flex animate-fadeUpDelayed items-center gap-3 text-xs">
                  {previewUrl && (
                    <img
                      src={previewUrl}
                      alt="Preview"
                      className="h-16 w-16 rounded-xl border border-slate-600/80 object-cover"
                    />
                  )}
                  <div>
                    <p className="text-slate-100">
                      {file.name || "Selected scan"}
                    </p>
                    <p className="mt-1 text-[0.7rem] text-slate-400">
                      {(file.size / 1024).toFixed(1)} KB •{" "}
                      {file.type || "image"}
                    </p>
                    <button
                      type="button"
                      onClick={clearFile}
                      className="mt-1 inline-flex items-center space-x-1 rounded-full border border-slate-600/80 px-3 py-1 text-[0.7rem] text-slate-300 transition hover:border-sky-500/80 hover:bg-slate-900 hover:text-slate-100"
                    >
                      <span>✕</span>
                      <span>Remove</span>
                    </button>
                  </div>
                </div>
              )}

              <button
                type="button"
                disabled={!file || predicting}
                onClick={runPrediction}
                className={`mt-4 inline-flex items-center space-x-2 rounded-full bg-gradient-to-r from-emerald-400 to-lime-300 px-4 py-2 text-[0.8rem] font-semibold uppercase tracking-[0.18em] text-emerald-950 shadow-[0_14px_35px_rgba(21,128,61,0.85)] transition ${
                  !file || predicting
                    ? "cursor-not-allowed opacity-60 shadow-none"
                    : "hover:-translate-y-[1px] hover:brightness-105 active:translate-y-0"
                }`}
              >
                <span>⚡</span>
                <span>
                  {predicting ? "Running prediction..." : "Run prediction"}
                </span>
              </button>
              {!file && (
                <p className="mt-2 text-[0.76rem] text-slate-400">
                  Attach a foot image to unlock AI predictions.
                </p>
              )}
            </section>

            <section className="relative animate-fadeUpDelayed rounded-2xl border border-slate-800/80 bg-slate-950/95 p-5 shadow-[0_18px_40px_rgba(15,23,42,1)]">
              <div className="absolute inset-0 -z-10 rounded-2xl bg-[radial-gradient(circle_at_0_0,rgba(56,189,248,0.14),transparent_55%),radial-gradient(circle_at_100%_100%,rgba(0,201,167,0.12),transparent_55%)]" />
              <h2 className="font-display text-[0.78rem] font-semibold uppercase tracking-[0.18em]">
                AI triage output
              </h2>
              <p className="mt-1 text-[0.78rem] text-slate-400">
                Risk stratification and Wagner-style classification.
              </p>

              {prediction ? (
                <div className="mt-4 space-y-3">
                  <div className="flex items-center justify-between gap-3">
                    <div className={riskClasses[prediction.risk]}>
                      <span>
                        {prediction.risk === "High"
                          ? "🔴"
                          : prediction.risk === "Medium"
                          ? "🟡"
                          : "🟢"}
                      </span>
                      <span>{prediction.risk} risk</span>
                    </div>
                    <span className="inline-flex items-center space-x-1 rounded-full border border-slate-600/80 bg-slate-950 px-2.5 py-1 text-[0.7rem] text-slate-300">
                      <span>🧠</span>
                      <span>Swin-ZSL DFU v1.2</span>
                    </span>
                  </div>
                  <p className="text-[0.86rem] text-slate-200">
                    Predicted class:{" "}
                    <span className="font-medium text-slate-50">
                      {prediction.predicted_class}
                    </span>
                  </p>

                  <div>
                    <p className="text-[0.76rem] text-slate-400">
                      Model confidence
                    </p>
                    <div className="mt-1 h-2 w-full rounded-full border border-slate-700/80 bg-slate-950">
                      <div
                        className="h-full rounded-full bg-gradient-to-r from-accentPrimary to-accentSecondary transition-[width]"
                        style={{ width: `${confidencePercent}%` }}
                      />
                    </div>
                    <p className="mt-1 text-[0.76rem] text-slate-400">
                      {confidencePercent}% posterior probability for the
                      predicted class.
                    </p>
                  </div>

                  <div>
                    <p className="text-[0.76rem] text-slate-400">
                      Top-4 differential classes
                    </p>
                    <div className="mt-2 space-y-1.5 text-[0.76rem]">
                      {prediction.top_classes.map((c, i) => {
                        const pct = Math.round(c.prob * 100);
                        return (
                          <div
                            key={i}
                            className="flex items-center gap-2 text-slate-300"
                          >
                            <span className="w-32 truncate text-slate-400">
                              {c.name}
                            </span>
                            <div className="h-1.5 flex-1 rounded-full bg-slate-950">
                              <div
                                className="h-full rounded-full bg-gradient-to-r from-sky-400 to-blue-600 transition-[width]"
                                style={{ width: `${pct}%` }}
                              />
                            </div>
                            <span className="w-10 text-right text-slate-400">
                              {pct}%
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  <div className="mt-2 animate-fadeUpLate rounded-xl border-l-4 border-accentPrimary bg-slate-950 px-3 py-3 text-[0.76rem] text-slate-100">
                    <p className="mb-1 text-[0.78rem] font-semibold text-sky-300">
                      Clinical recommendation
                    </p>
                    <p>{prediction.recommendation}</p>
                  </div>
                </div>
              ) : (
                <p className="mt-4 text-[0.78rem] text-slate-400">
                  No predictions yet. Upload a plantar foot image and run
                  inference to see triage output.
                </p>
              )}
            </section>
          </div>

          {/* Right stack */}
          <div className="space-y-4">
            <section className="animate-fadeUpDelayed rounded-2xl border border-slate-800/80 bg-slate-950/95 p-5 shadow-[0_18px_40px_rgba(15,23,42,1)]">
              <h2 className="font-display text-[0.78rem] font-semibold uppercase tracking-[0.18em]">
                Recent DFU scans
              </h2>
              <p className="mt-1 text-[0.78rem] text-slate-400">
                Lightweight, in-memory history for this session.
              </p>
              {history.length === 0 ? (
                <p className="mt-4 text-[0.78rem] text-slate-400">
                  Predictions will appear here with risk color coding and
                  timestamps.
                </p>
              ) : (
                <div className="mt-3 max-h-72 space-y-2 overflow-y-auto text-[0.76rem]">
                  {history.map((h) => (
                    <div
                      key={h.id}
                      className="flex items-center gap-3 rounded-xl border border-slate-700/90 bg-slate-950 px-2.5 py-2"
                    >
                      {h.thumbnail ? (
                        <img
                          src={h.thumbnail}
                          alt={h.name}
                          className="h-10 w-10 rounded-lg border border-slate-600/80 object-cover"
                        />
                      ) : (
                        <div className="h-10 w-10 rounded-lg border border-slate-600/80 bg-slate-900" />
                      )}
                      <div className="flex-1">
                        <p className="truncate text-slate-100">{h.name}</p>
                        <p className="text-[0.7rem] text-slate-400">
                          {h.date}
                        </p>
                      </div>
                      <span className="inline-flex items-center space-x-1 rounded-full border border-slate-600/80 px-2.5 py-1 text-[0.7rem] text-slate-300">
                        <span
                          className={`h-1.5 w-1.5 rounded-full ${riskDotColor(
                            h.risk
                          )}`}
                        />
                        <span>{h.risk} risk</span>
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </section>

            <section className="animate-fadeUpLate rounded-2xl border border-slate-800/80 bg-slate-950/95 p-5 shadow-[0_18px_40px_rgba(15,23,42,1)]">
              <h2 className="font-display text-[0.78rem] font-semibold uppercase tracking-[0.18em]">
                How it works
              </h2>
              <p className="mt-1 text-[0.78rem] text-slate-400">
                From pixels to Wagner-classified DFU risk.
              </p>
              <div className="mt-3 grid gap-2 text-[0.76rem] sm:grid-cols-2">
                <div className="rounded-xl border border-slate-700/90 bg-slate-950 p-3">
                  <div className="mb-1 flex items-center gap-2">
                    <div className="flex h-6 w-6 items-center justify-center rounded-full border border-slate-600/80 bg-slate-950 text-xs">
                      🧹
                    </div>
                    <p className="font-medium text-slate-100">Preprocessing</p>
                  </div>
                  <p className="text-slate-400">
                    Color normalization, ROI extraction, and resizing standardize
                    the plantar view before inference.
                  </p>
                </div>
                <div className="rounded-xl border border-slate-700/90 bg-slate-950 p-3">
                  <div className="mb-1 flex items-center gap-2">
                    <div className="flex h-6 w-6 items-center justify-center rounded-full border border-slate-600/80 bg-slate-950 text-xs">
                      🌀
                    </div>
                    <p className="font-medium text-slate-100">
                      Swin Transformer
                    </p>
                  </div>
                  <p className="text-slate-400">
                    A shifted-window transformer backbone encodes local texture
                    and global limb context.
                  </p>
                </div>
                <div className="rounded-xl border border-slate-700/90 bg-slate-950 p-3">
                  <div className="mb-1 flex items-center gap-2">
                    <div className="flex h-6 w-6 items-center justify-center rounded-full border border-slate-600/80 bg-slate-950 text-xs">
                      🎯
                    </div>
                    <p className="font-medium text-slate-100">
                      Zero-shot learning
                    </p>
                  </div>
                  <p className="text-slate-400">
                    Clinical text prompts map embeddings into semantic DFU-space,
                    enabling rare-class generalization.
                  </p>
                </div>
                <div className="rounded-xl border border-slate-700/90 bg-slate-950 p-3">
                  <div className="mb-1 flex items-center gap-2">
                    <div className="flex h-6 w-6 items-center justify-center rounded-full border border-slate-600/80 bg-slate-950 text-xs">
                      📊
                    </div>
                    <p className="font-medium text-slate-100">
                      Wagner classification
                    </p>
                  </div>
                  <p className="text-slate-400">
                    Outputs are calibrated to Wagner-like severities to support
                    triage rather than definitive diagnosis.
                  </p>
                </div>
              </div>
            </section>
          </div>
        </div>
      </div>
    </main>
  );
}

function AdminPage() {
  const [tab, setTab] = useState<"dashboard" | "model" | "users" | "api">(
    "dashboard"
  );

  const users = [
    {
      id: 1,
      name: "Dr. Alice Jensen",
      email: "alice.jensen@universityhospital.org",
      role: "admin",
      scans: 342,
      joined: "2023-04-12"
    },
    {
      id: 2,
      name: "Dr. Miguel Torres",
      email: "miguel.torres@vascularclinic.com",
      role: "user",
      scans: 189,
      joined: "2023-08-02"
    },
    {
      id: 3,
      name: "Nurse Fatima Rahman",
      email: "fatima.rahman@diabetescenter.org",
      role: "user",
      scans: 96,
      joined: "2024-02-19"
    },
    {
      id: 4,
      name: "Dr. Noah Patel",
      email: "noah.patel@footandankle.org",
      role: "user",
      scans: 51,
      joined: "2024-11-03"
    }
  ];

  const codeInstall =
    "pip install fastapi uvicorn pillow torch torchvision";

  const codeServer = `from fastapi import FastAPI, File, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import List
from io import BytesIO
from PIL import Image
import torch
import torchvision.transforms as T

app = FastAPI(title="DFU Predict API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

device = torch.device("cuda" if torch.cuda.is_available() else "cpu")

# Replace with your own path & model definition
model_path = "dfu_swin_zsl.pt"
model = torch.load(model_path, map_location=device)
model.eval()

transform = T.Compose([
    T.Resize((224, 224)),
    T.ToTensor(),
    T.Normalize(
        mean=[0.485, 0.456, 0.406],
        std=[0.229, 0.224, 0.225],
    ),
])

CLASSES = [
    "Neuropathic DFU",
    "Ischemic DFU",
    "Neuroischemic DFU",
    "Healed Scar",
    "Healthy Plantar Skin",
]

class TopClass(BaseModel):
    name: str
    prob: float

class PredictResponse(BaseModel):
    predicted_class: str
    risk: str
    confidence: float
    top_classes: List[TopClass]
    recommendation: str

@app.post("/predict", response_model=PredictResponse)
async def predict(image: UploadFile = File(...)):
    contents = await image.read()
    img = Image.open(BytesIO(contents)).convert("RGB")
    x = transform(img).unsqueeze(0).to(device)

    with torch.no_grad():
        logits = model(x)
        probs = torch.softmax(logits, dim=1)[0].cpu().numpy()

    top_indices = probs.argsort()[::-1][:4]
    top = [
        TopClass(name=CLASSES[i], prob=float(probs[i]))
        for i in top_indices
    ]

    main = top[0]
    conf = float(main.prob)

    # Simple risk mapping; tune to your dataset
    if conf > 0.8 and main.name != "Healthy Plantar Skin":
        risk = "High"
        recommendation = (
            "Urgent referral to multidisciplinary foot team within 24 hours. "
            "Offload pressure, optimize glycemic control, and consider imaging."
        )
    elif conf > 0.6:
        risk = "Medium"
        recommendation = (
            "Arrange specialist podiatry review within 1 week and offload high-pressure areas."
        )
    else:
        risk = "Low"
        recommendation = (
            "Continue routine foot surveillance and educate the patient on red-flag symptoms."
        )

    return PredictResponse(
        predicted_class=main.name,
        risk=risk,
        confidence=conf,
        top_classes=top,
        recommendation=recommendation,
    )

# Run with:
# uvicorn main:app --reload --host 0.0.0.0 --port 8000
`;

  const codeFetch = `async function callDFUPredict(file) {
  const formData = new FormData();
  formData.append("image", file);

  const res = await fetch("https://your-api-host/predict", {
    method: "POST",
    body: formData,
  });

  if (!res.ok) {
    throw new Error(\`Prediction failed: \${res.status}\`);
  }

  const data = await res.json();
  // { predicted_class, risk, confidence, top_classes[], recommendation }
  return data;
}

// In the DFU Predict frontend, replace simulatePredict() with callDFUPredict(file).`;

  return (
    <main className="relative min-h-screen bg-bgmain">
      <div className="pointer-events-none fixed inset-0 -z-10 bg-[radial-gradient(circle_at_10%_20%,rgba(0,201,167,0.18),transparent_55%),radial-gradient(circle_at_80%_0%,rgba(56,189,248,0.18),transparent_55%),radial-gradient(circle_at_50%_100%,rgba(59,130,246,0.16),transparent_55%)]" />
      <div className="mx-auto max-w-5xl px-4 pb-10 pt-10">
        <h1 className="font-display text-[0.78rem] font-semibold uppercase tracking-[0.18em] text-slate-100">
          Admin control plane
        </h1>
        <p className="mt-1 text-[0.78rem] text-slate-400">
          Monitor inference usage, manage model lifecycle, and integrate the DFU
          API.
        </p>

        <div className="mt-4 inline-flex rounded-full border border-slate-700/90 bg-slate-950/90 p-1 text-[0.76rem]">
          {(["dashboard", "model", "users", "api"] as const).map((t) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`rounded-full px-3 py-1 capitalize transition ${
                tab === t
                  ? "bg-gradient-to-r from-accentPrimary to-accentSecondary font-semibold text-slate-950 shadow-lg"
                  : "text-slate-400 hover:text-slate-100"
              }`}
            >
              {t === "api" ? "API Guide" : t}
            </button>
          ))}
        </div>

        {tab === "dashboard" && (
          <div className="mt-5 space-y-4 animate-fadeUp">
            <div className="grid gap-3 md:grid-cols-4">
              <div className="rounded-xl border border-slate-800 bg-slate-950 p-3 text-[0.8rem]">
                <p className="text-[0.72rem] text-slate-400">Active users</p>
                <p className="mt-1 font-display text-lg font-semibold">
                  128
                </p>
                <span className="mt-1 inline-flex items-center space-x-1 rounded-full border border-slate-600/80 px-2 py-1 text-[0.7rem] text-slate-300">
                  <span>↑ 12%</span>
                  <span>vs last 30 days</span>
                </span>
              </div>
              <div className="rounded-xl border border-slate-800 bg-slate-950 p-3 text-[0.8rem]">
                <p className="text-[0.72rem] text-slate-400">
                  Scans processed
                </p>
                <p className="mt-1 font-display text-lg font-semibold">
                  4,392
                </p>
                <span className="mt-1 inline-flex items-center space-x-1 rounded-full border border-slate-600/80 px-2 py-1 text-[0.7rem] text-slate-300">
                  <span>⚡</span>
                  <span>P95 latency 210ms</span>
                </span>
              </div>
              <div className="rounded-xl border border-slate-800 bg-slate-950 p-3 text-[0.8rem]">
                <p className="text-[0.72rem] text-slate-400">
                  High-risk flags
                </p>
                <p className="mt-1 font-display text-lg font-semibold">
                  612
                </p>
                <span className="mt-1 inline-flex items-center space-x-1 rounded-full border border-slate-600/80 px-2 py-1 text-[0.7rem] text-slate-300">
                  <span>🔴</span>
                  <span>18% of all scans</span>
                </span>
              </div>
              <div className="rounded-xl border border-slate-800 bg-slate-950 p-3 text-[0.8rem]">
                <p className="text-[0.72rem] text-slate-400">
                  Uptime (30 days)
                </p>
                <p className="mt-1 font-display text-lg font-semibold">
                  99.97%
                </p>
                <span className="mt-1 inline-flex items-center space-x-1 rounded-full border border-slate-600/80 px-2 py-1 text-[0.7rem] text-slate-300">
                  <span>✅</span>
                  <span>SLA &lt; 99.9% alerts</span>
                </span>
              </div>
            </div>

            <div className="rounded-2xl border border-slate-800 bg-slate-950 p-4 text-[0.78rem]">
              <h2 className="font-display text-[0.78rem] font-semibold uppercase tracking-[0.18em]">
                System status
              </h2>
              <table className="mt-2 w-full border-collapse text-left text-[0.76rem]">
                <thead>
                  <tr className="text-slate-400">
                    <th className="border-b border-slate-800 px-2 py-2">
                      Component
                    </th>
                    <th className="border-b border-slate-800 px-2 py-2">
                      Region
                    </th>
                    <th className="border-b border-slate-800 px-2 py-2">
                      Status
                    </th>
                    <th className="border-b border-slate-800 px-2 py-2">
                      Notes
                    </th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td className="border-b border-slate-800 px-2 py-2">
                      Inference API
                    </td>
                    <td className="border-b border-slate-800 px-2 py-2">
                      eu-west-1
                    </td>
                    <td className="border-b border-slate-800 px-2 py-2">
                      <span className="rounded-full border border-emerald-400/80 bg-emerald-900/80 px-2 py-1 text-[0.7rem] text-emerald-100">
                        Healthy
                      </span>
                    </td>
                    <td className="border-b border-slate-800 px-2 py-2">
                      Autoscaling to 4× A10G GPUs.
                    </td>
                  </tr>
                  <tr>
                    <td className="border-b border-slate-800 px-2 py-2">
                      Feature store
                    </td>
                    <td className="border-b border-slate-800 px-2 py-2">
                      eu-west-1
                    </td>
                    <td className="border-b border-slate-800 px-2 py-2">
                      <span className="rounded-full border border-emerald-400/80 bg-emerald-900/80 px-2 py-1 text-[0.7rem] text-emerald-100">
                        Healthy
                      </span>
                    </td>
                    <td className="border-b border-slate-800 px-2 py-2">
                      Cold storage replicated to eu-central-1.
                    </td>
                  </tr>
                  <tr>
                    <td className="px-2 py-2">Monitoring &amp; alerts</td>
                    <td className="px-2 py-2">global</td>
                    <td className="px-2 py-2">
                      <span className="rounded-full border border-amber-400/90 bg-amber-900/80 px-2 py-1 text-[0.7rem] text-amber-50">
                        Degraded
                      </span>
                    </td>
                    <td className="px-2 py-2">
                      Intermittent delay in exporting traces. No impact on
                      inference.
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        )}

        {tab === "model" && (
          <div className="mt-5 grid gap-4 animate-fadeUp md:grid-cols-[2fr,1.2fr]">
            <div className="rounded-2xl border border-slate-800 bg-slate-950 p-4 text-[0.78rem]">
              <h2 className="font-display text-[0.78rem] font-semibold uppercase tracking-[0.18em]">
                Model metadata
              </h2>
              <div className="mt-3 grid gap-2 sm:grid-cols-2">
                {[
                  ["Name", "dfu-swin-zsl-eu-v1.2"],
                  ["Version", "1.2.0"],
                  ["Status", "Serving"],
                  ["Architecture", "Swin-T + zero-shot head"],
                  ["Classes", "5 DFU + healthy"],
                  ["Input size", "3×224×224 RGB"],
                  ["Internal AUROC", "0.93"],
                  ["Artifact size", "186 MB (.pt)"]
                ].map(([label, value]) => (
                  <div
                    key={label}
                    className="rounded-lg border border-slate-700/90 bg-slate-950 px-3 py-2"
                  >
                    <p className="text-[0.72rem] text-slate-400">{label}</p>
                    {label === "Status" ? (
                      <p className="mt-1">
                        <span className="rounded-full border border-emerald-400/80 bg-emerald-900/80 px-2 py-1 text-[0.7rem] text-emerald-100">
                          Serving
                        </span>
                      </p>
                    ) : (
                      <p className="mt-1 text-[0.8rem] text-slate-100">
                        {value}
                      </p>
                    )}
                  </div>
                ))}
              </div>
              <div className="mt-3 flex flex-wrap gap-2 text-[0.76rem]">
                <button className="rounded-full border border-transparent bg-gradient-to-r from-accentPrimary to-accentSecondary px-3 py-1 text-[0.76rem] font-semibold text-slate-950 shadow-lg transition hover:-translate-y-[1px]">
                  Upload new artifact
                </button>
                <button className="rounded-full border border-sky-400/80 bg-slate-950 px-3 py-1 text-[0.76rem] text-sky-100 transition hover:-translate-y-[1px]">
                  Edit config
                </button>
                <button className="rounded-full border border-sky-400/80 bg-slate-950 px-3 py-1 text-[0.76rem] text-sky-100 transition hover:-translate-y-[1px]">
                  Run validation suite
                </button>
                <button className="rounded-full border border-sky-400/80 bg-slate-950 px-3 py-1 text-[0.76rem] text-sky-100 transition hover:-translate-y-[1px]">
                  Export snapshot
                </button>
                <button className="rounded-full border border-red-500/80 bg-slate-950 px-3 py-1 text-[0.76rem] text-red-200 transition hover:-translate-y-[1px]">
                  Remove model
                </button>
              </div>
            </div>
            <div className="rounded-2xl border border-slate-800 bg-slate-950 p-4 text-[0.78rem]">
              <h2 className="font-display text-[0.78rem] font-semibold uppercase tracking-[0.18em]">
                Deployment notes
              </h2>
              <p className="mt-1 text-[0.78rem] text-slate-400">
                Keep a human in the loop. DFU Predict is a triage aid, not a
                diagnostic device.
              </p>
              <ul className="mt-3 list-disc space-y-1 pl-4 text-[0.78rem] text-slate-300">
                <li>
                  Run validation on your local DFU dataset before activating new
                  versions.
                </li>
                <li>
                  Monitor drift by periodically auditing false positives /
                  negatives against clinician labels.
                </li>
                <li>
                  Use the API probabilistic outputs rather than hard thresholds
                  wherever possible.
                </li>
              </ul>
            </div>
          </div>
        )}

        {tab === "users" && (
          <div className="mt-5 animate-fadeUp">
            <div className="rounded-2xl border border-slate-800 bg-slate-950 p-4 text-[0.78rem]">
              <h2 className="font-display text-[0.78rem] font-semibold uppercase tracking-[0.18em]">
                Workspace users
              </h2>
              <p className="mt-1 text-[0.78rem] text-slate-400">
                Manage access across diabetology, vascular surgery, and
                podiatry teams.
              </p>
              <table className="mt-4 w-full border-collapse text-left text-[0.76rem]">
                <thead className="text-slate-400">
                  <tr>
                    <th className="border-b border-slate-800 px-2 py-2">
                      Name
                    </th>
                    <th className="border-b border-slate-800 px-2 py-2">
                      Email
                    </th>
                    <th className="border-b border-slate-800 px-2 py-2">
                      Role
                    </th>
                    <th className="border-b border-slate-800 px-2 py-2">
                      Scans
                    </th>
                    <th className="border-b border-slate-800 px-2 py-2">
                      Joined
                    </th>
                    <th className="border-b border-slate-800 px-2 py-2" />
                  </tr>
                </thead>
                <tbody>
                  {users.map((u) => (
                    <tr key={u.id} className="text-slate-100">
                      <td className="border-b border-slate-800 px-2 py-2">
                        {u.name}
                      </td>
                      <td className="border-b border-slate-800 px-2 py-2">
                        {u.email}
                      </td>
                      <td className="border-b border-slate-800 px-2 py-2">
                        <span
                          className={`rounded-full border px-2 py-1 text-[0.7rem] uppercase tracking-[0.14em] ${
                            u.role === "admin"
                              ? "border-red-500/90 text-red-200"
                              : "border-sky-400/90 text-sky-100"
                          }`}
                        >
                          {u.role}
                        </span>
                      </td>
                      <td className="border-b border-slate-800 px-2 py-2">
                        {u.scans}
                      </td>
                      <td className="border-b border-slate-800 px-2 py-2">
                        {u.joined}
                      </td>
                      <td className="border-b border-slate-800 px-2 py-2">
                        <button
                          type="button"
                          onClick={() =>
                            alert(
                              "This is a mock UI; wire this button to your user management backend."
                            )
                          }
                          className="rounded-full border border-red-500/80 px-3 py-1 text-[0.72rem] text-red-200 transition hover:-translate-y-[1px] hover:bg-red-900/80"
                        >
                          Remove
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {tab === "api" && (
          <div className="mt-5 space-y-4 animate-fadeUp">
            <div className="rounded-2xl border border-slate-800 bg-slate-950 p-4 text-[0.78rem]">
              <h2 className="font-display text-[0.78rem] font-semibold uppercase tracking-[0.18em]">
                API integration guide
              </h2>
              <p className="mt-1 text-[0.78rem] text-slate-400">
                Deploy your own DFU Predict FastAPI server and swap out the mock
                client in this demo.
              </p>

              <div className="mt-4 rounded-xl border border-slate-800 bg-slate-950 p-3 text-[0.72rem]">
                <div className="mb-1 flex items-center justify-between text-slate-400">
                  <span>Python dependencies</span>
                  <span className="rounded-full border border-slate-600/80 px-2 py-0.5">
                    bash
                  </span>
                </div>
                <pre className="overflow-x-auto text-xs text-slate-100">
                  {codeInstall}
                </pre>
              </div>

              <div className="mt-3 rounded-xl border border-slate-800 bg-slate-950 p-3 text-[0.72rem]">
                <div className="mb-1 flex items-center justify-between text-slate-400">
                  <span>FastAPI server (main.py)</span>
                  <span className="rounded-full border border-slate-600/80 px-2 py-0.5">
                    python
                  </span>
                </div>
                <pre className="max-h-[420px] overflow-x-auto overflow-y-auto text-xs text-slate-100">
                  {codeServer}
                </pre>
              </div>

              <div className="mt-3 rounded-xl border border-slate-800 bg-slate-950 p-3 text-[0.72rem]">
                <div className="mb-1 flex items-center justify-between text-slate-400">
                  <span>Frontend integration</span>
                  <span className="rounded-full border border-slate-600/80 px-2 py-0.5">
                    javascript
                  </span>
                </div>
                <pre className="overflow-x-auto text-xs text-slate-100">
                  {codeFetch}
                </pre>
              </div>
            </div>
          </div>
        )}
      </div>
    </main>
  );
}

export default function IndexPage() {
  const [user, setUser] = useState<User | null>(null);
  const [page, setPage] = useState<Page>("auth");

  function handleAuthenticated(u: User) {
    setUser(u);
    setPage("home");
  }

  function handleSignOut() {
    setUser(null);
    setPage("auth");
  }

  let content: JSX.Element;
  if (!user || page === "auth") {
    content = <AuthPage onAuthenticated={handleAuthenticated} />;
  } else if (page === "home") {
    content = <HomePage user={user} />;
  } else {
    content = user.role === "admin" ? (
      <AdminPage />
    ) : (
      <HomePage user={user} />
    );
  }

  return (
    <div className="flex min-h-screen flex-col bg-bgmain">
      <Navbar
        user={user}
        currentPage={page}
        setCurrentPage={setPage}
        onSignOut={handleSignOut}
      />
      {content}
    </div>
  );
}