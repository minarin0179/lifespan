import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { randomUUID } from "node:crypto";
import { NextResponse } from "next/server";

const MAX_IMAGE_BYTES = 8 * 1024 * 1024;
const IMAGE_EXTENSIONS: Record<string, string> = {
  "image/gif": "gif",
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp"
};

function safeBaseName(name: string): string {
  const base = name.replace(/\.[^.]+$/, "").replace(/[^a-zA-Z0-9_-]/g, "-");
  return base.replace(/-+/g, "-").replace(/^-|-$/g, "").slice(0, 48) || "image";
}

export async function POST(req: Request) {
  try {
    const formData = await req.formData();
    const image = formData.get("image");

    if (!(image instanceof File)) {
      return NextResponse.json({ error: "image is required" }, { status: 400 });
    }

    const extension = IMAGE_EXTENSIONS[image.type];
    if (!extension) {
      return NextResponse.json({ error: "unsupported image type" }, { status: 400 });
    }

    if (image.size > MAX_IMAGE_BYTES) {
      return NextResponse.json({ error: "image is too large" }, { status: 413 });
    }

    const uploadsDir = path.join(process.cwd(), "public", "uploads");
    await mkdir(uploadsDir, { recursive: true });

    const fileName = `${Date.now()}-${randomUUID()}-${safeBaseName(image.name)}.${extension}`;
    const filePath = path.join(uploadsDir, fileName);
    const buffer = Buffer.from(await image.arrayBuffer());
    await writeFile(filePath, buffer);

    return NextResponse.json({
      name: image.name,
      fileName,
      url: `/uploads/${fileName}`,
      publicPath: `GUI/public/uploads/${fileName}`
    });
  } catch (error) {
    return NextResponse.json(
      {
        error: "image upload failed",
        detail: error instanceof Error ? error.message : String(error)
      },
      { status: 500 }
    );
  }
}
