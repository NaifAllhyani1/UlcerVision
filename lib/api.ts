export type UserOut = { id: number; name?: string; email: string; role: "user" | "admin" };

export type ScanHistoryItem = {
  id: number;
  file_name: string;
  created_at: string;
  risk?: string;
  predicted_class?: string;
};

export type PredictResponse = {
  predicted_class: string;
  risk: "High" | "Medium" | "Low";
  confidence: number;
  top_classes: { name: string; prob: number }[];
  recommendation: string;
  scan_id: number;
  is_ood: boolean;
};

export type AdminStats = {
  totalUsers: number;
  totalScans: number;
  scansProcessed: number;
  predictionCounts: { healthy: number; infection: number; ischemia: number; both: number; none: number };
  avgConfidence: number;
};

export type AdminUserOut = {
  id: number;
  name: string;
  email: string;
  role: "user" | "admin";
  created_at: string;
  scan_count: number;
};

export type ModelRow = {
  id: number;
  name: string;
  version: string;
  status: "serving" | "inactive";
  architecture: string;
  artifact_path: string;
  auroc: number;
  uploaded_at: string;
} | null;

async function jsonOrEmpty(res: Response) {
  try {
    return await res.json();
  } catch {
    return {};
  }
}

async function ensureOk(res: Response, fallback: string) {
  if (res.ok) return;
  const body = await jsonOrEmpty(res);
  throw new Error(body?.error || `${fallback} (HTTP ${res.status})`);
}

export async function register(data: { name?: string; email: string; password: string }): Promise<{ user: UserOut }> {
  const res = await fetch("/api/auth/register", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
  await ensureOk(res, "Registration failed");
  // register endpoint returns {success,userId}; then login to set cookie and get user payload.
  return login(data.email, data.password);
}

export async function login(email: string, password: string): Promise<{ user: UserOut }> {
  const res = await fetch("/api/auth/login", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password }),
  });
  await ensureOk(res, "Login failed");
  const body = await res.json();
  return { user: body.user as UserOut };
}

export async function logout(): Promise<void> {
  await fetch("/api/auth/logout", { method: "POST" });
}

export async function me(): Promise<UserOut> {
  const res = await fetch("/api/auth/me");
  await ensureOk(res, "Not authenticated");
  return (await res.json()) as UserOut;
}

function riskFromPrediction(pred: string, conf: number): "High" | "Medium" | "Low" {
  const p = (pred || "").toLowerCase();
  if (p === "both") return conf >= 0.7 ? "High" : "Medium";
  if (p === "infection" || p === "ischemia") return conf >= 0.75 ? "High" : "Medium";
  return conf >= 0.8 ? "Medium" : "Low";
}

function recommendation(risk: "High" | "Medium" | "Low") {
  if (risk === "High")
    return "Urgent referral to multidisciplinary foot team within 24 hours. Offload pressure and assess for severe infection/ischemia.";
  if (risk === "Medium")
    return "Arrange specialist podiatry review within 1 week. Optimize offloading and wound care.";
  return "Continue routine surveillance and educate the patient on warning signs.";
}

function topClassesFromRaw(raw: any): { name: string; prob: number }[] {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return [];
  return Object.entries(raw)
    .filter(([, v]) => typeof v === "number")
    .map(([name, prob]) => ({ name, prob: Number(prob) }))
    .sort((a, b) => b.prob - a.prob)
    .slice(0, 4);
}

export async function predict(file: File): Promise<PredictResponse> {
  const form = new FormData();
  form.append("image", file);
  const res = await fetch("/api/scans/upload", { method: "POST", body: form });
  await ensureOk(res, "Prediction failed");
  const body = await res.json();
  const predicted = String(body.prediction || "healthy");
  const conf = typeof body.confidence === "number" ? body.confidence : 0;
  const isOod = body.is_ood === true;
  const risk = riskFromPrediction(predicted, conf);
  return {
    predicted_class: predicted,
    risk,
    confidence: conf,
    top_classes: topClassesFromRaw(body.raw_probabilities),
    recommendation: recommendation(risk),
    scan_id: Number(body.scanId || 0),
    is_ood: isOod,
  };
}

export async function scanHistory(): Promise<ScanHistoryItem[]> {
  const res = await fetch("/api/scans");
  await ensureOk(res, "Failed to load scans");
  const body = await res.json();
  const scans = Array.isArray(body.scans) ? body.scans : [];
  return scans.map((s: any) => ({
    id: s.id,
    file_name: (s.image_path || "").split("/").pop() || `scan-${s.id}`,
    created_at: s.uploaded_at,
    risk: riskFromPrediction(String(s.prediction || "healthy"), Number(s.confidence || 0)),
    predicted_class: s.prediction || "healthy",
  }));
}

export async function adminStats(): Promise<AdminStats> {
  const res = await fetch("/api/admin/stats");
  await ensureOk(res, "Failed to load stats");
  return (await res.json()) as AdminStats;
}

export async function adminUsers(): Promise<AdminUserOut[]> {
  const res = await fetch("/api/admin/users");
  await ensureOk(res, "Failed to load users");
  const body = await res.json();
  return (body.users || []) as AdminUserOut[];
}

export async function deleteAdminUser(id: number): Promise<void> {
  const res = await fetch(`/api/admin/users/${id}`, { method: "DELETE" });
  await ensureOk(res, "Failed to delete user");
}

export async function getServingModel(): Promise<ModelRow> {
  const res = await fetch("/api/admin/model");
  await ensureOk(res, "Failed to load model");
  const body = await res.json();
  return (body.model || null) as ModelRow;
}

export async function setServingModel(input: {
  name: string;
  version: string;
  artifactPath: string;
  auroc: number;
  architecture: string;
}): Promise<{ success: true; modelId: number }> {
  const res = await fetch("/api/admin/model", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });
  await ensureOk(res, "Failed to update model");
  return (await res.json()) as { success: true; modelId: number };
}

export async function adminLogs(): Promise<any[]> {
  const res = await fetch("/api/admin/logs");
  await ensureOk(res, "Failed to load logs");
  const body = await res.json();
  return (body.logs || []) as any[];
}
