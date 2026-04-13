import { NextRequest, NextResponse } from "next/server";
import { neon } from "@neondatabase/serverless";
import { put, del } from "@vercel/blob";

const sql = neon(process.env.DATABASE_URL!);

async function ensureBigint() {
  try {
    await sql`ALTER TABLE lender_documents ALTER COLUMN deal_id TYPE bigint`;
  } catch(e) {}
}

export async function GET(req: NextRequest) {
  const dealId = req.nextUrl.searchParams.get("dealId");
  const docId = req.nextUrl.searchParams.get("id");
  try {
    if (docId) {
      const r = await sql`SELECT * FROM lender_documents WHERE id = ${parseInt(docId)}`;
      return NextResponse.json(r[0] || null);
    }
    if (dealId) {
      const r = await sql`SELECT * FROM lender_documents WHERE deal_id = ${BigInt(dealId)} ORDER BY uploaded_at DESC`;
      return NextResponse.json(r);
    }
    const r = await sql`SELECT * FROM lender_documents ORDER BY uploaded_at DESC`;
    return NextResponse.json(r);
  } catch(e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    await ensureBigint();
    const formData = await req.formData();
    const file = formData.get("file") as File;
    const dealId = formData.get("dealId") as string;
    const dealNumber = formData.get("dealNumber") as string || "";
    const uploadedBy = formData.get("uploadedBy") as string || "Admin";
    const uploadedByRole = formData.get("uploadedByRole") as string || "admin";
    const docType = formData.get("docType") as string || "Other";
    const docLabel = formData.get("docLabel") as string || docType;

    if (!file || !dealId) {
      return NextResponse.json({ error: "Missing file or dealId" }, { status: 400 });
    }

    const ext = file.name.split(".").pop() || "bin";
    const filename = `deals/${dealId}/${Date.now()}-${docLabel.replace(/[^a-z0-9]/gi, "_")}.${ext}`;
    const blob = await put(filename, file, { access: "public" });

    const result = await sql`
      INSERT INTO lender_documents (deal_id, deal_number, document_name, document_type, document_url, uploaded_by, uploaded_by_role, uploaded_at, lender_name)
      VALUES (${BigInt(dealId)}, ${dealNumber}, ${file.name}, ${docType}, ${blob.url}, ${uploadedBy}, ${uploadedByRole}, NOW(), ${uploadedBy})
      RETURNING *
    `;

    return NextResponse.json({ success: true, doc: result[0] });
  } catch(e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  const docId = req.nextUrl.searchParams.get("id");
  if (!docId) return NextResponse.json({ error: "Missing id" }, { status: 400 });
  try {
    const [doc] = await sql`SELECT * FROM lender_documents WHERE id = ${parseInt(docId)}`;
    if (doc?.document_url) {
      try { await del(doc.document_url); } catch(e) {}
    }
    await sql`DELETE FROM lender_documents WHERE id = ${parseInt(docId)}`;
    return NextResponse.json({ success: true });
  } catch(e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
