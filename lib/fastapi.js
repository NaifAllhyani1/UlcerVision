const FASTAPI_URL = process.env.FASTAPI_URL || "http://localhost:8000";

export async function callPredict(fileOrBlob, filename = "image.jpg") {
  const form = new FormData();
  // The backend accepts both 'file' and 'image' keys
  form.append("file", fileOrBlob, filename);

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 30000); // 30s timeout

  try {
    const res = await fetch(`${FASTAPI_URL}/predict`, {
      method: "POST",
      body: form,
      signal: controller.signal,
    });
    if (!res.ok) {
      const body = await res.text().catch(() => "");
      throw new Error(`FastAPI /predict failed (${res.status}): ${body}`);
    }
    return res.json();
  } catch (err) {
    if (err.name === "AbortError") {
      throw new Error("FastAPI /predict timed out — is the backend running on port 8000?");
    }
    throw err;
  } finally {
    clearTimeout(timeout);
  }
}

export async function callHealth() {
  const res = await fetch(`${FASTAPI_URL}/health`);
  if (!res.ok) throw new Error(`FastAPI /health failed (${res.status})`);
  return res.json();
}

export async function callReloadModel(artifactPath) {
  const res = await fetch(`${FASTAPI_URL}/reload-model`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ artifact_path: artifactPath }),
  });
  if (!res.ok) throw new Error(`FastAPI /reload-model failed (${res.status})`);
  return res.json();
}

