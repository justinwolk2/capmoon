"use client";
import { useEffect, useState } from "react";

const DOC_TYPES = [
  "Rent Roll", "T12 Financials", "Operating Statement", "Tax Returns (2yr)",
  "Bank Statements (3mo)", "Purchase Contract", "Appraisal", "Environmental Report",
  "Survey", "Title Report", "Loan Application", "Personal Financial Statement",
  "Entity Documents", "Construction Budget", "Proforma", "Other"
];

export default function UploadPage({ params }: { params: { token: string } }) {
  const { token } = params;
  const [request, setRequest] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [uploads, setUploads] = useState<{ docType: string; docLabel: string; file: File | null; uploading: boolean; done: boolean; url: string }[]>([]);
  const [submitted, setSubmitted] = useState(false);

  useEffect(() => {
    fetch("/api/document-request?token=" + token)
      .then(r => r.json())
      .then(d => {
        setRequest(d);
        if (d?.documents_needed) {
          setUploads(d.documents_needed.map((doc: string) => ({ docType: doc, docLabel: doc === "Other" ? "" : doc, file: null, uploading: false, done: false, url: "" })));
        }
        setLoading(false);
      });
  }, [token]);

  async function uploadFile(idx: number) {
    const u = uploads[idx];
    if (!u.file) return;
    setUploads(prev => prev.map((x, i) => i === idx ? { ...x, uploading: true } : x));

    const formData = new FormData();
    formData.append("file", u.file);
    formData.append("dealId", String(request.deal_id));
    formData.append("dealNumber", request.deal_number || "");
    formData.append("uploadedBy", request.borrower_name);
    formData.append("uploadedByRole", "borrower");
    formData.append("docType", u.docType);
    formData.append("docLabel", u.docLabel || u.docType);

    const res = await fetch("/api/upload", { method: "POST", body: formData });
    const data = await res.json();

    setUploads(prev => prev.map((x, i) => i === idx ? { ...x, uploading: false, done: true, url: data.url || "" } : x));
  }

  async function submitAll() {
    for (let i = 0; i < uploads.length; i++) {
      if (uploads[i].file && !uploads[i].done) await uploadFile(i);
    }
    setSubmitted(true);
  }

  const navy = "#0a1f44";
  const gold = "#c9a84c";

  if (loading) return <div style={{ display: "flex", alignItems: "center", justifyContent: "center", minHeight: "100vh", fontFamily: "Montserrat,sans-serif", color: "#666" }}>Loading...</div>;
  if (!request) return <div style={{ display: "flex", alignItems: "center", justifyContent: "center", minHeight: "100vh", fontFamily: "Montserrat,sans-serif", color: "#666" }}>Invalid or expired link.</div>;

  if (submitted) return (
    <div style={{ minHeight: "100vh", background: "#f0f2f5", fontFamily: "Montserrat,sans-serif", padding: "40px 20px", display: "flex", alignItems: "center", justifyContent: "center" }}>
      <div style={{ maxWidth: 560, width: "100%", background: "white", borderRadius: 12, padding: 40, textAlign: "center" }}>
        <div style={{ fontSize: 48, marginBottom: 16 }}>✅</div>
        <div style={{ fontSize: 20, fontWeight: 800, color: navy, marginBottom: 8 }}>Documents Submitted</div>
        <div style={{ fontSize: 14, color: "#666" }}>Your documents have been uploaded and the CapMoon team has been notified. Thank you!</div>
      </div>
    </div>
  );

  return (
    <div style={{ minHeight: "100vh", background: "#f0f2f5", fontFamily: "Montserrat,sans-serif", padding: "40px 20px" }}>
      <div style={{ maxWidth: 640, margin: "0 auto" }}>
        <div style={{ background: navy, borderRadius: 12, padding: "28px 32px", marginBottom: 24 }}>
          <div style={{ fontSize: 10, letterSpacing: "0.25em", textTransform: "uppercase", color: "rgba(255,255,255,0.4)", marginBottom: 8 }}>CapMoon · Document Upload</div>
          <div style={{ fontSize: 20, fontWeight: 800, color: "white", marginBottom: 4 }}>Deal {request.deal_number || request.deal_id}</div>
          <div style={{ fontSize: 13, color: "rgba(255,255,255,0.6)" }}>Requested by {request.requested_by}</div>
        </div>

        <div style={{ background: "white", borderRadius: 12, padding: 28 }}>
          <p style={{ fontSize: 14, color: "#333", marginBottom: 20, lineHeight: 1.7 }}>
            Please upload the following documents for <strong>{request.borrower_name}</strong>:
          </p>

          <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
            {uploads.map((u, idx) => (
              <div key={idx} style={{ border: `1px solid ${u.done ? "#10b981" : "#e5e7eb"}`, borderRadius: 10, padding: 16, background: u.done ? "#f0fdf4" : "white" }}>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 10 }}>
                  <div style={{ fontWeight: 700, fontSize: 14, color: navy }}>{u.docType}</div>
                  {u.done && <span style={{ color: "#10b981", fontSize: 12, fontWeight: 700 }}>✓ Uploaded</span>}
                </div>
                {u.docType === "Other" && (
                  <input value={u.docLabel} onChange={e => setUploads(prev => prev.map((x, i) => i === idx ? { ...x, docLabel: e.target.value } : x))}
                    placeholder="Describe this document..." style={{ width: "100%", padding: "8px 12px", border: "1px solid #ddd", borderRadius: 8, fontSize: 13, marginBottom: 10, boxSizing: "border-box" as any }} />
                )}
                {!u.done && (
                  <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
                    <input type="file" accept=".pdf,.doc,.docx,.xls,.xlsx,.jpg,.jpeg,.png"
                      onChange={e => setUploads(prev => prev.map((x, i) => i === idx ? { ...x, file: e.target.files?.[0] || null } : x))}
                      style={{ flex: 1, fontSize: 13 }} />
                    {u.file && (
                      <button onClick={() => uploadFile(idx)} disabled={u.uploading}
                        style={{ padding: "8px 16px", background: navy, color: "white", border: "none", borderRadius: 8, fontSize: 13, fontWeight: 700, cursor: "pointer", whiteSpace: "nowrap" as any }}>
                        {u.uploading ? "Uploading..." : "Upload"}
                      </button>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>

          <button onClick={submitAll} style={{ width: "100%", marginTop: 24, padding: 16, background: gold, color: navy, border: "none", borderRadius: 10, fontSize: 15, fontWeight: 800, cursor: "pointer" }}>
            Submit All Documents
          </button>
        </div>

        <div style={{ textAlign: "center", marginTop: 20, fontSize: 11, color: "#bbb" }}>CapMoon, LLC · Secure Document Upload · Confidential</div>
      </div>
    </div>
  );
}
