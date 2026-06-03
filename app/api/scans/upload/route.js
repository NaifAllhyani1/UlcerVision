import { NextResponse } from "next/server";
import fs from "node:fs/promises";
import path from "node:path";
import { randomUUID } from "node:crypto";
import db from "@/lib/db";
import { verifyTokenFromCookies } from "@/lib/auth";
import { callPredict } from "@/lib/fastapi";

async function saveUploadBuffer(buffer, originalName) {
  const uploadDir = path.join(process.cwd(), "public", "uploads");
  await fs.mkdir(uploadDir, { recursive: true });
  const ext = path.extname(originalName || "").toLowerCase() || ".jpg";
  const fileName = `${Date.now()}-${randomUUID()}${ext}`;
  const absPath = path.join(uploadDir, fileName);
  await fs.writeFile(absPath, buffer);
  return `/uploads/${fileName}`;
}

function normalizePredictResponse(data) {
  const prediction = data?.prediction ?? data?.predicted_class ?? "healthy";
  const confidence = typeof data?.confidence === "number" ? data.confidence : 0;
  const raw = data?.probabilities ?? data?.raw_probabilities ?? {};
  const modelVersion = data?.model_version ?? "unknown";
  const isOod = data?.is_ood === true;
  const maxSimilarity = typeof data?.max_similarity === "number" ? data.max_similarity : null;
  return { prediction, confidence, raw, modelVersion, isOod, maxSimilarity };
}

export async function POST(req) {
  const payload = await verifyTokenFromCookies();
  if (!payload) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const form = await req.formData();
    const image = form.get("image");
    if (!(image instanceof File)) {
      return NextResponse.json({ error: "image is required" }, { status: 400 });
    }

    // Read the file buffer once — streams can only be consumed once
    const arrayBuf = await image.arrayBuffer();
    const buffer = Buffer.from(arrayBuf);

    const imagePath = await saveUploadBuffer(buffer, image.name);
    const insertScan = db
      .prepare("INSERT INTO scans (user_id, image_path, status) VALUES (?, ?, 'pending')")
      .run(payload.id, imagePath);
    const scanId = Number(insertScan.lastInsertRowid);

    // Create a fresh Blob from the buffer for the FastAPI call
    const blob = new Blob([buffer], { type: image.type || "image/jpeg" });
    let normalized;
    let backendWarning = null;
    try {
      const predictData = await callPredict(blob, image.name);
      normalized = normalizePredictResponse(predictData);
    } catch (predictErr) {
      console.error("[scans/upload] Prediction backend error:", predictErr.message);
      backendWarning = predictErr.message;
      normalized = { prediction: "pending", confidence: 0, raw: { healthy: 0, infection: 0, ischemia: 0, both: 0 }, modelVersion: "unavailable" };
    }

    db.prepare(
      "INSERT INTO scan_results (scan_id, prediction, confidence, raw_probabilities, model_version) VALUES (?, ?, ?, ?, ?)"
    ).run(scanId, normalized.prediction, normalized.confidence, JSON.stringify(normalized.raw), normalized.modelVersion);

    db.prepare("UPDATE scans SET status = 'done' WHERE id = ?").run(scanId);
    db.prepare("INSERT INTO notifications (user_id, scan_id, message, is_read) VALUES (?, ?, ?, 0)").run(
      payload.id,
      scanId,
      `Scan #${scanId} completed: ${normalized.prediction}`
    );

    return NextResponse.json({
      success: true,
      scanId,
      imagePath,
      prediction: normalized.prediction,
      confidence: normalized.confidence,
      raw_probabilities: normalized.raw,
      model_version: normalized.modelVersion,
      is_ood: normalized.isOod,
      max_similarity: normalized.maxSimilarity,
      ...(backendWarning ? { warning: backendWarning } : {}),
    });
  } catch (err) {
    console.error("[scans/upload] Error:", err);
    return NextResponse.json({ error: err instanceof Error ? err.message : "Upload failed" }, { status: 500 });
  }
}

