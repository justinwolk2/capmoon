"use client";
import React from "react";
import { Filter, Users, Landmark, FileSpreadsheet, FileText } from "lucide-react";

export function DealCard({ deal, session, isAdmin, teamMembers, users, submittedDeals, setSubmittedDeals, lenderRecords, setPrefillDeal, setActiveTab }: {
  deal: any; session: any; isAdmin: boolean; teamMembers: any[]; users: any[];
  submittedDeals: any[]; setSubmittedDeals: (d: any[]) => void;
  lenderRecords: any[]; setPrefillDeal: (d: any) => void; setActiveTab: (t: string) => void;
}) {
  const [showInvite, setShowInvite] = React.useState(false);
  const [showLenderResponses, setShowLenderResponses] = React.useState(false);
  const [showSendLenders, setShowSendLenders] = React.useState(false);
  const [showDocUpload, setShowDocUpload] = React.useState(false);
  const [showDocRequest, setShowDocRequest] = React.useState(false);
  const [editingDeal, setEditingDeal] = React.useState(false);
  const [threadMessages, setThreadMessages] = React.useState<Record<string, any[]>>({});
  const [threadInput, setThreadInput] = React.useState<Record<string, string>>({});
  const [threadLoading, setThreadLoading] = React.useState<Record<string, boolean>>({});
  const [replyOpen, setReplyOpen] = React.useState<Record<string, boolean>>({});
  const [sentLenders, setSentLenders] = React.useState<any[]>([]);
  const [selectedLenderIds, setSelectedLenderIds] = React.useState<number[]>([]);
  const [sendingToLenders, setSendingToLenders] = React.useState(false);
  const [dealDocs, setDealDocs] = React.useState<any[]>([]);
  const [docType, setDocType] = React.useState("Rent Roll");
  const [docLabel, setDocLabel] = React.useState("");
  const [docFile, setDocFile] = React.useState<File | null>(null);
  const [docUploading, setDocUploading] = React.useState(false);
  const [requestDocs, setRequestDocs] = React.useState<string[]>([]);
  const [requestEmail, setRequestEmail] = React.useState(deal.seekerEmail || "");
  const [requestSending, setRequestSending] = React.useState(false);
  const [requestSent, setRequestSent] = React.useState(false);
  const [inviteUserId, setInviteUserId] = React.useState("");
  const [editDealFields, setEditDealFields] = React.useState({
    seekerName: deal.seekerName || "", seekerEmail: deal.seekerEmail || "",
    seekerPhone: deal.seekerPhone || "", notes: deal.notes || "",
    loanAmount: deal.assets?.[0]?.loanAmount || "", propertyValue: deal.assets?.[0]?.propertyValue || "",
    dscr: deal.assets?.[0]?.dscr || "", currentNetIncome: deal.assets?.[0]?.currentNetIncome || "",
  });

  const loadSentLenders = React.useCallback(() => {
    fetch("/api/lender-submissions?dealId=" + deal.id)
      .then(r => r.json()).then(d => { if (Array.isArray(d)) setSentLenders(d); }).catch(() => {});
  }, [deal.id]);

  React.useEffect(() => { loadSentLenders(); }, [loadSentLenders]);

  React.useEffect(() => {
    fetch("/api/upload?dealId=" + deal.id).then(r => r.json())
      .then(d => { if (Array.isArray(d)) setDealDocs(d); }).catch(() => {});
  }, [deal.id]);

  React.useEffect(() => {
    if (showLenderResponses && sentLenders.length > 0) {
      sentLenders.forEach(sl => { if (!threadMessages[sl.token]) loadThread(sl.token); });
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [showLenderResponses, sentLenders]);

  async function loadThread(token: string) {
    const msgs = await fetch("/api/submission-messages?token=" + token).then(r => r.json());
    if (Array.isArray(msgs)) setThreadMessages(p => ({ ...p, [token]: msgs }));
  }

  async function sendMessage(token: string) {
    const msg = (threadInput[token] || "").trim();
    if (!msg) return;
    setThreadLoading(p => ({ ...p, [token]: true }));
    setThreadInput(p => ({ ...p, [token]: "" }));
    await fetch("/api/submission-messages", { method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ token, dealId: deal.id, senderName: session?.user.name || "Admin",
        senderRole: session?.user.role || "admin", message: msg }) });
    await loadThread(token);
    setThreadLoading(p => ({ ...p, [token]: false }));
  }

  async function updateLenderResponseStatus(token: string, newStatus: string) {
    await fetch("/api/lender-submissions", { method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "respond", token, status: newStatus }) });
    loadSentLenders();
  }

  async function sendToLenders() {
    setSendingToLenders(true);
    const advisor = teamMembers.find((m: any) => deal.assignedAdvisorIds?.includes(m.id));
    for (const lid of selectedLenderIds) {
      const lender = lenderRecords.find((l: any) => l.id === lid);
      if (!lender) continue;
      const email = lender.contacts?.[0]?.email || lender.email || "";
      await fetch("/api/lender-submissions", { method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "send", dealId: deal.id, lenderId: lid, lenderName: lender.lender,
          lenderEmail: email, dealTitle: (deal.assets?.[0]?.assetType || "CRE") + " - " + (deal.assets?.[0]?.loanAmount || "TBD"),
          advisorName: advisor?.name || "CapMoon" }) });
    }
    loadSentLenders();
    setSelectedLenderIds([]); setShowSendLenders(false); setSendingToLenders(false);
  }

  function updateDealStatus(status: string) {
    const updated = submittedDeals.map((d: any) => d.id === deal.id ? { ...d, status } : d);
    setSubmittedDeals(updated);
    fetch("/api/data", { method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ type: "deals", data: updated }) }).catch(console.error);
  }

  function saveDealEdits() {
    const updated = { ...deal, seekerName: editDealFields.seekerName, seekerEmail: editDealFields.seekerEmail,
      seekerPhone: editDealFields.seekerPhone, notes: editDealFields.notes,
      assets: deal.assets.map((a: any, i: number) => i === 0 ? { ...a, loanAmount: editDealFields.loanAmount,
        propertyValue: editDealFields.propertyValue, dscr: editDealFields.dscr,
        currentNetIncome: editDealFields.currentNetIncome } : a) };
    const newDeals = submittedDeals.map((d: any) => d.id === deal.id ? updated : d);
    setSubmittedDeals(newDeals);
    fetch("/api/data", { method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ type: "deals", data: newDeals }) }).catch(console.error);
    setEditingDeal(false);
  }

  function handleInvite() {
    if (!inviteUserId) return;
    const uid = parseInt(inviteUserId);
    if ((deal.invitedUserIds || []).includes(uid)) return;
    const updated = submittedDeals.map((d: any) => d.id === deal.id ? { ...d, invitedUserIds: [...(d.invitedUserIds || []), uid] } : d);
    setSubmittedDeals(updated);
    fetch("/api/data", { method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ type: "deals", data: updated }) }).catch(console.error);
    setInviteUserId(""); setShowInvite(false);
  }

  function removeInvite(uid: number) {
    const updated = submittedDeals.map((d: any) => d.id === deal.id ? { ...d, invitedUserIds: (d.invitedUserIds || []).filter((id: number) => id !== uid) } : d);
    setSubmittedDeals(updated);
    fetch("/api/data", { method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ type: "deals", data: updated }) }).catch(console.error);
  }

  async function uploadDoc() {
    if (!docFile) return;
    setDocUploading(true);
    const formData = new FormData();
    formData.append("file", docFile); formData.append("dealId", String(deal.id));
    formData.append("dealNumber", deal.dealNumber || ""); formData.append("uploadedBy", session?.user.name || "Admin");
    formData.append("uploadedByRole", session?.user.role || "admin"); formData.append("docType", docType);
    formData.append("docLabel", docType === "Other" ? docLabel : docType);
    const res = await fetch("/api/upload", { method: "POST", body: formData });
    const data = await res.json();
    if (data.success) {
      const updated = await fetch("/api/upload?dealId=" + deal.id).then(r => r.json());
      if (Array.isArray(updated)) setDealDocs(updated);
      setDocFile(null); setDocType("Rent Roll"); setDocLabel(""); setShowDocUpload(false);
    } else { alert("Upload failed: " + (data.error || "Unknown error")); }
    setDocUploading(false);
  }

  async function deleteDoc(docId: number, docName: string) {
    if (isAdmin) {
      if (!window.confirm(`Delete "${docName}"?`)) return;
      await fetch("/api/upload?id=" + docId, { method: "DELETE" });
      const updated = await fetch("/api/upload?dealId=" + deal.id).then(r => r.json());
      if (Array.isArray(updated)) setDealDocs(updated);
    } else { alert("Delete request submitted to admin for approval."); }
  }

  async function sendDocRequest() {
    if (requestDocs.length === 0) return;
    setRequestSending(true);
    const advisor = teamMembers.find((m: any) => deal.assignedAdvisorIds?.includes(m.id));
    await fetch("/api/document-request", { method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ dealId: deal.id, dealNumber: deal.dealNumber, borrowerName: deal.seekerName,
        borrowerEmail: requestEmail, requestedBy: advisor?.name || session?.user.name || "CapMoon",
        requestedByRole: session?.user.role, documentsNeeded: requestDocs }) });
    setRequestSending(false); setRequestSent(true);
    setTimeout(() => { setRequestSent(false); setShowDocRequest(false); setRequestDocs([]); }, 3000);
  }

  const advisors = teamMembers.filter((m: any) => deal.assignedAdvisorIds.includes(m.id));
  const invitedUsers = users.filter((u: any) => (deal.invitedUserIds || []).includes(u.id));
  const docTypes = ["Rent Roll","T12 Financials","Operating Statement","Tax Returns (2yr)","Bank Statements (3mo)","Purchase Contract","Appraisal","Environmental Report","Survey","Title Report","Loan Application","Personal Financial Statement","Entity Documents","Construction Budget","Proforma","Other"];
  const docEmoji = (t: string) => {
    if (t.includes("Rent Roll")||t.includes("Financial")||t.includes("Statement")||t.includes("Budget")||t.includes("Proforma")) return "📊";
    if (t.includes("Tax")) return "🧾"; if (t.includes("Bank")) return "🏦"; if (t.includes("Contract")) return "📝";
    if (t.includes("Appraisal")) return "🏠"; if (t.includes("Environmental")||t.includes("Survey")) return "🗺️";
    if (t.includes("Title")) return "📋"; if (t.includes("Entity")||t.includes("Personal")) return "👤";
    if (t.includes("Construction")) return "🏗️"; return "📄";
  };
  const statusBadge = (s: string) => s==="declined"?"bg-red-100 text-red-600":s==="info_requested"?"bg-blue-100 text-blue-700":s==="viewed"?"bg-yellow-100 text-yellow-700":s==="quoted"?"bg-green-100 text-green-700":"bg-gray-100 text-gray-500";
  const statusLabel = (s: string) => s==="info_requested"?"Info Requested":s==="viewed"?"Viewed":s==="declined"?"Declined":s==="quoted"?"Quoted":"No Response Yet";

  return (
    <div className="rounded-xl border border-gray-200 bg-gray-50 p-5">
      <div className="flex items-start justify-between mb-4">
        <div>
          <div className="text-xs uppercase tracking-[0.15em] text-[#c9a84c] font-bold mb-1">Deal #{deal.id}</div>
          <div className="flex items-center gap-2 flex-wrap">
            <div className="text-base font-bold text-[#0a1f44]">{deal.seekerName}</div>
            {deal.dealNumber && <span className="px-2 py-0.5 text-xs bg-[#c9a84c]/20 text-[#0a1f44] rounded-full font-bold border border-[#c9a84c]/30">{deal.dealNumber}</span>}
          </div>
          <div className="flex flex-wrap gap-2 mt-1">
            {deal.assets[0]?.assetType && <span className="text-xs text-gray-500 font-medium">{deal.assets[0].assetType}</span>}
            {deal.assets[0]?.loanAmount && <span className="text-xs text-[#0a1f44] font-bold">{deal.assets[0].loanAmount}</span>}
            {deal.capitalType && <span className="text-xs px-2 py-0.5 bg-blue-50 text-blue-700 rounded-full border border-blue-100">{deal.capitalType}</span>}
            {deal.assets[0]?.address?.city && <span className="text-xs text-gray-400">📍 {deal.assets[0].address.city}, {deal.assets[0].address.state}</span>}
          </div>
          <div className="text-xs text-gray-400 mt-0.5">Submitted: {deal.submittedAt}</div>
        </div>
        <select value={deal.status} onChange={(e) => updateDealStatus(e.target.value)}
          className={`px-3 py-1 rounded-full text-xs font-semibold border cursor-pointer ${deal.status==="pending"?"bg-amber-50 text-amber-600 border-amber-200":deal.status==="assigned"?"bg-blue-50 text-blue-600 border-blue-200":"bg-emerald-50 text-emerald-600 border-emerald-200"}`}>
          <option value="pending">Pending</option><option value="assigned">Assigned</option><option value="closed">Closed</option>
        </select>
      </div>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-3">
        {[["Capital Type",deal.capitalType],["Loan Amount",deal.assets[0]?.loanAmount||"—"],["Asset Type",deal.assets[0]?.assetType||"—"],["Property Value",deal.assets[0]?.propertyValue||"—"],["DSCR",deal.assets[0]?.dscr||"—"],["Assets",`${deal.assets.length} asset${deal.assets.length>1?"s":""}`]].map(([label,val])=>(
          <div key={String(label)} className="rounded-lg bg-white border border-gray-200 p-3"><div className="text-xs text-gray-400 mb-1">{label}</div><div className="text-sm font-bold text-[#0a1f44]">{val}</div></div>
        ))}
      </div>
      {deal.assets.map((asset: any, idx: number) => asset.address?.city ? (
        <div key={idx} className="text-xs text-gray-500 mt-1">Asset {idx+1}: {asset.address.street?`${asset.address.street}, `:""}{asset.address.city}, {asset.address.state} {asset.address.zip}</div>
      ) : null)}
      {advisors.length > 0 && (
        <div className="mt-4 pt-4 border-t border-gray-200">
          <div className="text-xs uppercase tracking-[0.15em] text-[#0a1f44] font-bold mb-3">Assigned Advisor{advisors.length>1?"s":""}</div>
          <div className="flex gap-3 flex-wrap">
            {advisors.map((advisor: any) => (
              <div key={advisor.id} className="flex items-center gap-3 bg-[#0a1f44] rounded-xl px-4 py-3">
                <img src={advisor.photo||"/logo1.JPEG"} alt={advisor.name} className="h-10 w-10 rounded-lg object-cover border border-[#c9a84c]/30 flex-shrink-0" />
                <div><div className="text-xs font-bold text-white">{advisor.name}</div><div className="text-xs text-[#c9a84c]">{advisor.title}</div><div className="text-xs text-gray-400 mt-0.5">{advisor.phone}</div></div>
              </div>
            ))}
          </div>
        </div>
      )}
      {invitedUsers.length > 0 && (
        <div className="mt-3 pt-3 border-t border-gray-200">
          <div className="text-xs uppercase tracking-[0.15em] text-[#0a1f44] font-bold mb-2">Collaborators</div>
          <div className="flex flex-wrap gap-2">
            {invitedUsers.map((u: any) => (
              <div key={u.id} className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-[#c9a84c]/10 border border-[#c9a84c]/20">
                <span className="text-xs font-medium text-[#0a1f44]">{u.name}</span><span className="text-xs text-gray-400">· {u.role}</span>
                {isAdmin && <button onClick={() => removeInvite(u.id)} className="ml-1 text-gray-400 hover:text-red-500 text-xs font-bold">✕</button>}
              </div>
            ))}
          </div>
        </div>
      )}
      <div className="mt-4 pt-4 border-t border-gray-200 flex flex-wrap gap-2">
        <button onClick={() => { setPrefillDeal(deal); setActiveTab("matcher"); }} className="flex items-center gap-2 px-4 py-2 text-sm font-semibold bg-[#0a1f44] text-white rounded-xl hover:bg-[#0a1f44]/80">
          <Filter className="h-4 w-4" /> Resubmit to Deal Matcher
        </button>
        <button onClick={() => setShowInvite(!showInvite)} className="flex items-center gap-2 px-4 py-2 text-sm font-medium border border-[#c9a84c]/30 text-[#0a1f44] rounded-xl hover:bg-[#c9a84c]/10">
          <Users className="h-4 w-4" /> Invite Collaborator
        </button>
        <button onClick={() => setShowLenderResponses(v => !v)}
          className={"flex items-center gap-2 px-4 py-2 text-sm font-medium border rounded-xl transition-all "+(showLenderResponses?"border-[#0a1f44] bg-[#0a1f44] text-white":"border-[#0a1f44]/30 text-[#0a1f44] hover:bg-[#0a1f44]/5")}>
          <Landmark className="h-4 w-4" /> Lender Responses
          {sentLenders.length > 0 && <span className={"ml-1 px-1.5 py-0.5 text-xs rounded-full font-bold "+(showLenderResponses?"bg-white text-[#0a1f44]":"bg-[#c9a84c] text-[#0a1f44]")}>{sentLenders.length}</span>}
        </button>
      </div>
      <div className="mt-3 space-y-2">
        <div className="flex gap-2 flex-wrap">
          <button type="button" onClick={() => setShowDocUpload(p => !p)}
            className={"flex items-center gap-2 px-4 py-2 text-xs font-semibold border rounded-xl transition-all "+(showDocUpload?"border-[#0a1f44] bg-[#0a1f44] text-white":"border-gray-200 text-gray-600 hover:border-[#0a1f44]/30")}>
            <FileSpreadsheet className="h-3.5 w-3.5" /> Upload Docs
            {dealDocs.length > 0 && <span className={"ml-1 px-1.5 py-0.5 text-xs rounded-full font-bold "+(showDocUpload?"bg-white text-[#0a1f44]":"bg-[#0a1f44] text-white")}>{dealDocs.length}</span>}
          </button>
          <button type="button" onClick={() => setShowDocRequest(p => !p)}
            className={"flex items-center gap-2 px-4 py-2 text-xs font-semibold border rounded-xl transition-all "+(showDocRequest?"border-[#c9a84c] bg-[#c9a84c] text-[#0a1f44]":"border-gray-200 text-gray-600 hover:border-[#c9a84c]/30")}>
            <FileText className="h-3.5 w-3.5" /> Request Docs from Borrower
          </button>
        </div>
        {showDocUpload && (
          <div className="rounded-xl border border-gray-200 bg-gray-50 p-4 space-y-3">
            <div className="text-xs font-bold text-[#0a1f44] uppercase tracking-wide">Upload Document</div>
            <div className="grid gap-2 md:grid-cols-2">
              <div><label className="text-xs text-gray-500 mb-1 block font-bold">Document Type</label>
                <select value={docType} onChange={e => setDocType(e.target.value)} className="w-full px-3 py-2 text-sm bg-white border border-gray-200 rounded-xl focus:outline-none focus:border-[#0a1f44]">
                  {docTypes.map(t => <option key={t} value={t}>{t}</option>)}
                </select></div>
              <div><label className="text-xs text-gray-500 mb-1 block font-bold">File</label>
                <input type="file" accept=".pdf,.doc,.docx,.xls,.xlsx,.jpg,.jpeg,.png" onChange={e => setDocFile(e.target.files?.[0] || null)} className="w-full px-3 py-2 text-sm bg-white border border-gray-200 rounded-xl" /></div>
            </div>
            {docType === "Other" && <input value={docLabel} onChange={e => setDocLabel(e.target.value)} placeholder="Describe this document..." className="w-full px-3 py-2 text-sm bg-white border border-gray-200 rounded-xl" />}
            {docFile && <button type="button" onClick={uploadDoc} disabled={docUploading} className="w-full py-2.5 text-sm font-bold bg-[#0a1f44] text-white rounded-xl hover:bg-[#0a1f44]/80 disabled:opacity-50">{docUploading?"Uploading...":"Upload "+(docType==="Other"?docLabel||"Document":docType)}</button>}
          </div>
        )}
        {showDocRequest && (
          <div className="rounded-xl border border-[#c9a84c]/20 bg-[#c9a84c]/5 p-4 space-y-3">
            <div className="text-xs font-bold text-[#0a1f44] uppercase tracking-wide">Request Documents from Borrower</div>
            <div><label className="text-xs text-gray-500 mb-1 block font-bold">Borrower Email</label>
              <input value={requestEmail} onChange={e => setRequestEmail(e.target.value)} placeholder="borrower@email.com" className="w-full px-3 py-2 text-sm bg-white border border-gray-200 rounded-xl" /></div>
            <div><label className="text-xs text-gray-500 mb-2 block font-bold">Documents Needed</label>
              <div className="flex flex-wrap gap-1.5">
                {docTypes.map(t => <button key={t} type="button" onClick={() => setRequestDocs(p => p.includes(t)?p.filter(x=>x!==t):[...p,t])}
                  className={"px-2.5 py-1 text-xs rounded-full border font-medium transition-all "+(requestDocs.includes(t)?"bg-[#0a1f44] text-white border-[#0a1f44]":"bg-white text-gray-500 border-gray-200 hover:border-[#0a1f44]/30")}>{t}</button>)}
              </div></div>
            {requestDocs.length > 0 && <button type="button" onClick={sendDocRequest} disabled={requestSending||requestSent}
              className={"w-full py-2.5 text-sm font-bold rounded-xl "+(requestSent?"bg-green-500 text-white":"bg-[#c9a84c] text-[#0a1f44] hover:bg-[#c9a84c]/80")}>
              {requestSent?"✓ Sent!":requestSending?"Sending...":`Send Request (${requestDocs.length} docs)`}</button>}
          </div>
        )}
      </div>
      {showInvite && (
        <div className="mt-3 rounded-xl border border-[#c9a84c]/20 bg-[#c9a84c]/5 p-4">
          <div className="text-xs font-bold text-[#0a1f44] uppercase tracking-wide mb-3">Invite a Collaborator</div>
          <div className="flex gap-2">
            <select value={inviteUserId} onChange={(e) => setInviteUserId(e.target.value)} className="flex-1 px-3 py-2 text-sm bg-white border border-gray-300 rounded-xl text-gray-800 focus:outline-none focus:border-[#0a1f44]">
              <option value="">Select a user...</option>
              {users.filter((u: any) => u.id !== session?.user.id && !(deal.invitedUserIds || []).includes(u.id)).map((u: any) => <option key={u.id} value={u.id}>{u.name} ({u.role})</option>)}
            </select>
            <button onClick={handleInvite} className="px-4 py-2 text-sm font-semibold bg-[#0a1f44] text-white rounded-xl hover:bg-[#0a1f44]/80">Invite</button>
            <button onClick={() => setShowInvite(false)} className="px-3 py-2 text-sm border border-gray-200 text-gray-500 rounded-xl hover:bg-gray-50">Cancel</button>
          </div>
        </div>
      )}
      {dealDocs.length > 0 && (
        <div className="mt-3 rounded-xl overflow-hidden border border-[#0a1f44]/15">
          <div className="flex items-center justify-between px-4 py-3 bg-[#0a1f44]">
            <div className="flex items-center gap-2"><span className="text-base">📁</span><span className="text-xs font-bold text-white uppercase tracking-wider">Deal Documents</span><span className="px-2 py-0.5 text-xs bg-[#c9a84c] text-[#0a1f44] rounded-full font-bold">{dealDocs.length}</span></div>
            {deal.dealNumber && <span className="text-xs text-white/50">{deal.dealNumber}</span>}
          </div>
          <div className="bg-white divide-y divide-gray-100">
            {dealDocs.map((doc: any) => (
              <div key={doc.id} className="flex items-center gap-3 px-4 py-3">
                <span className="text-xl flex-shrink-0">{docEmoji(doc.document_type||"")}</span>
                <div className="flex-1 min-w-0"><div className="text-sm font-semibold text-[#0a1f44] truncate">{doc.document_name}</div><div className="text-xs text-gray-400 mt-0.5">{doc.lender_name} · {new Date(doc.uploaded_at).toLocaleDateString("en-US",{month:"short",day:"numeric",year:"numeric"})}</div></div>
                <div className="flex items-center gap-2 flex-shrink-0">
                  <a href={doc.document_url} target="_blank" rel="noopener noreferrer" className="px-3 py-1.5 text-xs font-bold bg-[#0a1f44] text-white rounded-lg hover:bg-[#0a1f44]/80">View</a>
                  <button type="button" onClick={() => deleteDoc(doc.id, doc.document_name)} className={"px-3 py-1.5 text-xs font-bold border rounded-lg "+(isAdmin?"border-red-200 text-red-500 hover:bg-red-50":"border-gray-200 text-gray-400 hover:bg-gray-50")}>{isAdmin?"Delete":"Remove"}</button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
      {showLenderResponses && (
        <div className="mt-3 rounded-xl border border-[#0a1f44]/20 bg-white p-4">
          <div className="text-xs font-bold text-[#0a1f44] uppercase tracking-wide mb-3">Lender Responses</div>
          {sentLenders.length === 0 ? (
            <div className="text-xs text-gray-400 py-4 text-center">No lenders have been sent this deal yet.</div>
          ) : (
            <div className="space-y-2">
              {sentLenders.map((sl: any) => (
                <div key={sl.id} className={"rounded-lg border p-3 "+(sl.status==="declined"?"border-red-200 bg-red-50":"border-gray-100 bg-gray-50")}>
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-bold text-[#0a1f44] truncate">{sl.lender_name}</div>
                      <div className="text-xs text-gray-400 mt-0.5">Sent {new Date(sl.created_at).toLocaleDateString()}{sl.viewed_at?" · Viewed "+new Date(sl.viewed_at).toLocaleDateString():""}</div>
                      {sl.response_message && <div className="mt-2 px-3 py-2 bg-white border border-gray-200 rounded-lg text-xs text-gray-600 italic">"{sl.response_message}"</div>}
                    </div>
                    <div className="flex flex-col items-end gap-2 flex-shrink-0">
                      <span className={"px-2.5 py-1 text-xs font-bold rounded-full "+statusBadge(sl.status)}>{statusLabel(sl.status)}</span>
                      {isAdmin && (
                        <select value={sl.status} onChange={e => updateLenderResponseStatus(sl.token, e.target.value)}
                          className="text-xs border border-gray-200 rounded-lg px-2 py-1 text-gray-500 bg-white focus:outline-none focus:border-[#0a1f44]">
                          <option value="sent">Sent</option><option value="viewed">Viewed</option>
                          <option value="info_requested">Info Requested</option><option value="quoted">Quoted</option><option value="declined">Declined</option>
                        </select>
                      )}
                    </div>
                  </div>
                  {sl.responded_at && <div className="text-xs text-gray-400 mt-1">Responded {new Date(sl.responded_at).toLocaleDateString()}</div>}
                  <div className="mt-3 border-t border-gray-200 pt-3">
                    <button onClick={() => { const isOpen=replyOpen[sl.token]; setReplyOpen(p=>({...p,[sl.token]:!isOpen})); if(!isOpen&&!threadMessages[sl.token]) loadThread(sl.token); }}
                      className="text-xs font-semibold text-[#0a1f44] hover:underline flex items-center gap-1">
                      💬 {threadMessages[sl.token]?.length?`${threadMessages[sl.token].length} message${threadMessages[sl.token].length>1?"s":""}` :"View / Add Message"}
                    </button>
                    {replyOpen[sl.token] && (
                      <div className="mt-2 space-y-2">
                        {(threadMessages[sl.token]||[]).map((msg:any,i:number)=>(
                          <div key={i} className={"px-3 py-2 rounded-lg text-xs "+(msg.sender_role==="lender"?"bg-blue-50 border border-blue-100 text-blue-800":"bg-[#0a1f44]/5 border border-[#0a1f44]/10 text-[#0a1f44]")}>
                            <div className="font-bold mb-0.5">{msg.sender_name} <span className="font-normal text-gray-400">· {new Date(msg.created_at).toLocaleDateString()}</span></div>
                            <div>{msg.message}</div>
                          </div>
                        ))}
                        {threadMessages[sl.token]?.length===0 && <div className="text-xs text-gray-400">No messages yet.</div>}
                        <div className="flex gap-2 mt-2">
                          <input value={threadInput[sl.token]||""} onChange={e=>setThreadInput(p=>({...p,[sl.token]:e.target.value}))}
                            onKeyDown={e=>{if(e.key==="Enter"&&!e.shiftKey){e.preventDefault();sendMessage(sl.token);}}}
                            placeholder="Type a message..." className="flex-1 px-3 py-2 text-xs bg-white border border-gray-200 rounded-lg focus:outline-none focus:border-[#0a1f44]" />
                          <button onClick={()=>sendMessage(sl.token)} disabled={threadLoading[sl.token]||!(threadInput[sl.token]||"").trim()}
                            className="px-3 py-2 text-xs font-bold bg-[#0a1f44] text-white rounded-lg hover:bg-[#0a1f44]/80 disabled:opacity-50">
                            {threadLoading[sl.token]?"...":"Send"}
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
