import { NextResponse } from "next/server";
import db from "@/lib/db";
import { requireAdmin } from "@/lib/admin-auth";
import { callReloadModel } from "@/lib/fastapi";

export async function GET() {
  const admin = await requireAdmin();
  if (admin.response) return admin.response;

  const model = db
    .prepare(
      `SELECT id, name, version, status, architecture, artifact_path, auroc, uploaded_at
       FROM model_registry
       WHERE status = 'serving'
       ORDER BY uploaded_at DESC
       LIMIT 1`
    )
    .get();

  return NextResponse.json({ model: model || null });
}

export async function POST(req) {
  const admin = await requireAdmin();
  if (admin.response) return admin.response;

  try {
    const { name, version, artifactPath, auroc, architecture } = await req.json();
    const cleanName = String(name || "").trim();
    const cleanVersion = String(version || "").trim();
    const cleanArtifactPath = String(artifactPath || "").trim();
    const cleanArchitecture = String(architecture || "").trim();
    const cleanAuroc = Number(auroc);

    if (!cleanName || !cleanVersion || !cleanArtifactPath || !cleanArchitecture || Number.isNaN(cleanAuroc)) {
      return NextResponse.json(
        { error: "name, version, artifactPath, auroc, architecture are required" },
        { status: 400 }
      );
    }

    const trx = db.transaction(() => {
      db.prepare("UPDATE model_registry SET status='inactive' WHERE status='serving'").run();
      return db
        .prepare(
          `INSERT INTO model_registry (name, version, status, architecture, artifact_path, auroc)
           VALUES (?, ?, 'serving', ?, ?, ?)`
        )
        .run(cleanName, cleanVersion, cleanArchitecture, cleanArtifactPath, cleanAuroc);
    });

    const result = trx();
    const modelId = Number(result.lastInsertRowid);
    await callReloadModel(cleanArtifactPath);

    return NextResponse.json({ success: true, modelId });
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : "Internal Server Error" }, { status: 500 });
  }
}

