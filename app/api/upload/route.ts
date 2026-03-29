import { NextRequest, NextResponse } from "next/server";
import { put } from "@vercel/blob";
import { neon } from "@neondatabase/serverless";

const sql = neon(process.env.DATABASE_URL!);

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const file = formData.get("file") as File;
    const dealId = formData.get("dealId") as string;
    const dealNumber = formData.get("dealNumber") as string;
    const uploadedBy = formData.get("uploadedBy") as string;
    const uploadedByRole = formData.get("uploadedByRole") as string;
    const docType = formData.get("docType") as string;
    const docLabel = formData.get("docLabel") as string;

    if (!file) return NextResponse.json({ error: "No file provided" }, { status: 400 });

    // Upload to Vercel Blob organized by deal number
    const folder = dealNumber ? `deals/${dealNumber}` : `deals/deal-${dealId}`;
    const filename = `${folder}/${Date.now()}-${file.name.replace(/[^a-zA-Z0-9._-]/g, "_")}`;

    const blob = await put(filename, file, {
      access: "public",
      contentType: file.type,
    });

    // Save to DB
    await sql`INSERT INTO lender_documents
      (deal_id, lender_name, document_name, document_url, document_type, uploaded_at)
      VALUES (
        ${parseInt(dealId) || 0},
        ${uploadedBy || "Unknown"},
        ${docLabel || docType || file.name},
        ${blob.url},
        ${docType || "Other"},
        NOW()
      )`;

    return NextResponse.json({ success: true, url: blob.url, filename: blob.pathname });
  } catch (e: any) {
    console.error("Upload error:", e);
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}

export async function GET(req: NextRequest) {
  const dealId = req.nextUrl.searchParams.get("dealId");
  try {
    if (dealId) {
      const docs = await sql`SELECT * FROM lender_documents WHERE deal_id = ${parseInt(dealId)} ORDER BY uploaded_at DESC`;
      return NextResponse.json(docs);
    }
    const docs = await sql`SELECT * FROM lender_documents ORDER BY uploaded_at DESC`;
    return NextResponse.json(docs);
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  const id = req.nextUrl.searchParams.get("id");
  try {
    await sql`DELETE FROM lender_documents WHERE id = ${parseInt(id!)}`;
    return NextResponse.json({ success: true });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
