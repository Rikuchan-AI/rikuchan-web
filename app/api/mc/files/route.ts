import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/mc/supabase-server";
import { resolveTenantId } from "@/lib/mc/tenant";

const MC_ENABLED = process.env.NEXT_PUBLIC_MC_ENABLED === "true";

const BUCKET = "task-attachments";
const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10 MB
const ALLOWED_TYPES = new Set([
  "text/plain", "text/markdown", "text/csv",
  "application/json", "application/pdf",
  "application/zip", "application/x-zip-compressed",
  "image/png", "image/jpeg", "image/gif", "image/webp", "image/svg+xml",
  "application/yaml", "text/yaml",
  "application/javascript", "text/javascript",
  "application/typescript", "text/typescript",
  "application/xml", "text/xml",
]);

/**
 * POST /api/mc/files
 * Upload a file to Supabase Storage scoped by tenant/project/task.
 * Body: FormData with fields: file, projectId, taskId
 * Returns: { path, url }
 */
export async function POST(req: NextRequest) {
  if (!MC_ENABLED) {
    return NextResponse.json({ error: "Mission Control is disabled" }, { status: 503 });
  }
  try {
    const { tenantId } = await resolveTenantId();
    const formData = await req.formData();
    const file = formData.get("file") as File | null;
    const projectId = formData.get("projectId") as string | null;
    const taskId = formData.get("taskId") as string | null;

    if (!file) {
      return NextResponse.json({ error: "No file provided" }, { status: 400 });
    }
    if (!projectId || !taskId) {
      return NextResponse.json({ error: "projectId and taskId are required" }, { status: 400 });
    }
    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json({ error: "File too large (max 10 MB)" }, { status: 400 });
    }
    // Block dangerous extensions regardless of MIME type
    const ext = file.name.split(".").pop()?.toLowerCase() ?? "";
    const dangerousExts = new Set(["exe", "bat", "cmd", "com", "msi", "scr", "pif", "vbs", "vbe", "js", "jse", "wsf", "wsh", "ps1", "dll", "sys", "drv"]);
    if (dangerousExts.has(ext)) {
      return NextResponse.json({ error: "File type not allowed" }, { status: 400 });
    }

    // Validate MIME type or safe extension
    const safeExts = new Set(["md", "txt", "json", "csv", "yaml", "yml", "ts", "tsx", "jsx", "py", "go", "rs", "rb", "sh", "toml", "pdf", "png", "jpg", "jpeg", "gif", "webp", "svg", "zip"]);
    if (file.type && !ALLOWED_TYPES.has(file.type) && !file.type.startsWith("text/") && !safeExts.has(ext)) {
      return NextResponse.json({ error: "File type not allowed" }, { status: 400 });
    }

    const supabase = getSupabaseAdmin();

    // Ensure bucket exists (idempotent)
    const { error: bucketError } = await supabase.storage.getBucket(BUCKET);
    if (bucketError?.message?.includes("not found")) {
      await supabase.storage.createBucket(BUCKET, { public: false });
    }

    // Build storage path: {tenantId}/{projectId}/{taskId}/{timestamp}-{filename}
    const timestamp = Date.now();
    const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, "_");
    const storagePath = `${tenantId}/${projectId}/${taskId}/${timestamp}-${safeName}`;

    const buffer = Buffer.from(await file.arrayBuffer());

    const { error: uploadError } = await supabase.storage
      .from(BUCKET)
      .upload(storagePath, buffer, {
        contentType: file.type || "application/octet-stream",
        upsert: false,
      });

    if (uploadError) {
      console.error("[files] Upload failed:", uploadError);
      return NextResponse.json({ error: "Upload failed" }, { status: 500 });
    }

    return NextResponse.json({
      path: storagePath,
      name: file.name,
      size: file.size,
      type: file.type,
    });
  } catch (err: unknown) {
    console.error("[files] Error:", err);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}

/**
 * GET /api/mc/files?path=...
 * Generate a signed URL for downloading a file.
 */
export async function GET(req: NextRequest) {
  if (!MC_ENABLED) {
    return NextResponse.json({ error: "Mission Control is disabled" }, { status: 503 });
  }
  try {
    const { tenantId } = await resolveTenantId();
    const filePath = req.nextUrl.searchParams.get("path");

    if (!filePath) {
      return NextResponse.json({ error: "path parameter required" }, { status: 400 });
    }

    // Ensure the file belongs to this tenant
    if (!filePath.startsWith(`${tenantId}/`)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const supabase = getSupabaseAdmin();
    const { data, error } = await supabase.storage
      .from(BUCKET)
      .createSignedUrl(filePath, 3600); // 1 hour

    if (error || !data) {
      return NextResponse.json({ error: "File not found" }, { status: 404 });
    }

    return NextResponse.json({ url: data.signedUrl });
  } catch (err: unknown) {
    console.error("[files] Error:", err);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}
