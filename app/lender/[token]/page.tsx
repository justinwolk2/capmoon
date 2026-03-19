"use client";
import { useEffect, useState } from "react";

export default function LenderDealPage({ params }: { params: { token: string } }) {
  const { token } = params;
  const [data, setData] = useState<any>(null);
  const [action, setAction] = useState<"quote"|"info"|"decline"|null>(null);
  const [message, setMessage] = useState("");
  const [declineReason, setDeclineReason] = useState("");
  const [file, setFile] = useState<File|null>(null);
  const [submitted, setSubmitted] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/lender-submissions?token=" + token)
      .then(r => r.json())
      .then(d => { setData(d); setLoading(false); });
  }, [token]);

  async function respond() {
    if (!action) return;
    setSubmitting(true);

    let status = action === "quote" ? "quoted" : action === "info" ? "info_requested" : "declined";
    let responseMessage = action === "decline" ? declineReason : message;

    // Upload term sheet if provided
    let documentUrl = "";
    if (file && action === "quote") {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("dealId", data.deal_id);
      formData.append("lenderName", data.lender_name);
      formData.append("submissionId", data.id);
      try {
        const uploadRes = await fetch("/api/lender-documents", { method: "POST", body: formData });
        const uploadData = await uploadRes.json();
        documentUrl = uploadData.url || "";
      } catch(e) { console.error("Upload failed", e); }
    }

    await fetch("/api/lender-submissions", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "respond", token, status, message: responseMessage, documentUrl, lenderAction: action }),
    });

    setSubmitted(true);
    setSubmitting(false);
  }

  const navy = "#0a1f44";
  const gold = "#c9a84c";

  if (loading) return (
    <div style={{display:"flex",alignItems:"center",justifyContent:"center",minHeight:"100vh",fontFamily:"Montserrat,sans-serif",background:"#f0f2f5",color:"#666"}}>
      Loading deal...
    </div>
  );

  if (!data || data.error) return (
    <div style={{display:"flex",alignItems:"center",justifyContent:"center",minHeight:"100vh",fontFamily:"Montserrat,sans-serif",color:"#666"}}>
      Invalid or expired link.
    </div>
  );

  if (submitted) return (
    <div style={{minHeight:"100vh",background:"#f0f2f5",fontFamily:"Montserrat,sans-serif",padding:"40px 20px",display:"flex",alignItems:"center",justifyContent:"center"}}>
      <div style={{maxWidth:560,width:"100%",background:"white",borderRadius:12,padding:40,textAlign:"center"}}>
        <div style={{width:64,height:64,borderRadius:"50%",background:navy,display:"flex",alignItems:"center",justifyContent:"center",margin:"0 auto 20px",fontSize:28}}>
          {action==="quote"?"📋":action==="info"?"❓":"✓"}
        </div>
        <div style={{fontSize:20,fontWeight:800,color:navy,marginBottom:8}}>
          {action==="quote"?"Quote Submitted":action==="info"?"Information Requested":"Response Recorded"}
        </div>
        <div style={{fontSize:14,color:"#666",lineHeight:1.7}}>
          {action==="quote"
            ? "Your term sheet and cover note have been sent to the CapMoon advisory team."
            : action==="info"
            ? "Your request for more information has been sent to the advisor."
            : "Your decline has been noted. Thank you for reviewing this opportunity."}
        </div>
        <div style={{marginTop:24,fontSize:11,color:"#aaa"}}>CapMoon, LLC · Confidential</div>
      </div>
    </div>
  );

  return (
    <div style={{minHeight:"100vh",background:"#f0f2f5",fontFamily:"Montserrat,sans-serif",padding:"40px 20px"}}>
      <div style={{maxWidth:640,margin:"0 auto"}}>

        {/* Header */}
        <div style={{background:navy,borderRadius:12,padding:"28px 32px",marginBottom:20}}>
          <div style={{fontSize:10,letterSpacing:"0.25em",textTransform:"uppercase",color:"rgba(255,255,255,0.4)",marginBottom:8}}>CapMoon · Deal Opportunity</div>
          <div style={{fontSize:22,fontWeight:800,color:"white",marginBottom:6}}>{data.deal_title}</div>
          <div style={{fontSize:12,color:"rgba(255,255,255,0.55)"}}>Presented by {data.advisor_name}</div>
          {data.deal_number && <div style={{marginTop:8,display:"inline-block",padding:"3px 10px",background:"rgba(201,168,76,0.2)",borderRadius:20,fontSize:11,color:gold,fontWeight:700}}>Deal #{data.deal_number}</div>}
        </div>

        {/* Choose response */}
        {!action ? (
          <div style={{background:"white",borderRadius:12,padding:28}}>
            <div style={{fontSize:14,color:"#333",lineHeight:1.7,marginBottom:24}}>
              You have received a financing opportunity from <strong>CapMoon</strong>. Please review and select how you would like to respond.
            </div>
            <div style={{display:"flex",flexDirection:"column",gap:12}}>
              <button onClick={()=>setAction("quote")} style={{padding:"18px 24px",background:navy,color:"white",border:"none",borderRadius:10,fontSize:15,fontWeight:700,cursor:"pointer",textAlign:"left",display:"flex",alignItems:"center",gap:14}}>
                <span style={{fontSize:24}}>📋</span>
                <div>
                  <div>Quote This Deal</div>
                  <div style={{fontSize:12,fontWeight:400,opacity:0.7,marginTop:2}}>Submit a term sheet and cover note</div>
                </div>
              </button>
              <button onClick={()=>setAction("info")} style={{padding:"18px 24px",background:"white",color:navy,border:`2px solid ${navy}`,borderRadius:10,fontSize:15,fontWeight:700,cursor:"pointer",textAlign:"left",display:"flex",alignItems:"center",gap:14}}>
                <span style={{fontSize:24}}>❓</span>
                <div>
                  <div>Request More Information</div>
                  <div style={{fontSize:12,fontWeight:400,opacity:0.6,marginTop:2}}>Ask questions before deciding</div>
                </div>
              </button>
              <button onClick={()=>setAction("decline")} style={{padding:"18px 24px",background:"white",color:"#888",border:"2px solid #e0e0e0",borderRadius:10,fontSize:15,fontWeight:700,cursor:"pointer",textAlign:"left",display:"flex",alignItems:"center",gap:14}}>
                <span style={{fontSize:24}}>✕</span>
                <div>
                  <div>Decline / Not a Fit</div>
                  <div style={{fontSize:12,fontWeight:400,opacity:0.6,marginTop:2}}>Let the advisor and borrower know</div>
                </div>
              </button>
            </div>
          </div>
        ) : (
          <div style={{background:"white",borderRadius:12,padding:28}}>
            <button onClick={()=>setAction(null)} style={{background:"none",border:"none",color:"#888",fontSize:13,cursor:"pointer",marginBottom:20,padding:0}}>← Back</button>

            {action === "quote" && (
              <>
                <div style={{fontSize:16,fontWeight:800,color:navy,marginBottom:16}}>📋 Submit a Quote</div>
                <div style={{marginBottom:14}}>
                  <label style={{fontSize:12,color:"#888",display:"block",marginBottom:6,textTransform:"uppercase",letterSpacing:"0.1em"}}>Cover Note / Message</label>
                  <textarea value={message} onChange={e=>setMessage(e.target.value)} placeholder="Write your response to the advisor and borrower..." rows={4}
                    style={{width:"100%",padding:"12px 14px",border:"1px solid #ddd",borderRadius:8,fontSize:14,resize:"none",outline:"none",boxSizing:"border-box"}} />
                </div>
                <div style={{marginBottom:20}}>
                  <label style={{fontSize:12,color:"#888",display:"block",marginBottom:6,textTransform:"uppercase",letterSpacing:"0.1em"}}>Term Sheet (PDF or Word)</label>
                  <input type="file" accept=".pdf,.doc,.docx" onChange={e=>setFile(e.target.files?.[0]||null)}
                    style={{width:"100%",padding:"10px",border:"2px dashed #ddd",borderRadius:8,fontSize:13,cursor:"pointer"}} />
                  {file && <div style={{fontSize:12,color:"#666",marginTop:6}}>✓ {file.name} selected</div>}
                </div>
              </>
            )}

            {action === "info" && (
              <>
                <div style={{fontSize:16,fontWeight:800,color:navy,marginBottom:16}}>❓ Request More Information</div>
                <div style={{marginBottom:20}}>
                  <label style={{fontSize:12,color:"#888",display:"block",marginBottom:6,textTransform:"uppercase",letterSpacing:"0.1em"}}>What information do you need?</label>
                  <textarea value={message} onChange={e=>setMessage(e.target.value)} placeholder="Please describe what additional information or documents you need..." rows={5}
                    style={{width:"100%",padding:"12px 14px",border:"1px solid #ddd",borderRadius:8,fontSize:14,resize:"none",outline:"none",boxSizing:"border-box"}} />
                </div>
              </>
            )}

            {action === "decline" && (
              <>
                <div style={{fontSize:16,fontWeight:800,color:navy,marginBottom:16}}>✕ Decline This Deal</div>
                <div style={{marginBottom:14}}>
                  <label style={{fontSize:12,color:"#888",display:"block",marginBottom:8,textTransform:"uppercase",letterSpacing:"0.1em"}}>Reason for Declining</label>
                  <div style={{display:"flex",flexDirection:"column",gap:8,marginBottom:12}}>
                    {["Deal size outside our parameters","Asset type not a fit","Geography not covered","Leverage too high","Sponsor/credit concerns","Currently not deploying capital","Other"].map(reason => (
                      <label key={reason} style={{display:"flex",alignItems:"center",gap:10,padding:"10px 14px",border:`1px solid ${declineReason===reason?"#0a1f44":"#eee"}`,borderRadius:8,cursor:"pointer",background:declineReason===reason?"#f0f2f5":"white"}}>
                        <input type="radio" name="reason" value={reason} checked={declineReason===reason} onChange={()=>setDeclineReason(reason)} style={{accentColor:navy}} />
                        <span style={{fontSize:14,color:"#333"}}>{reason}</span>
                      </label>
                    ))}
                  </div>
                  {declineReason === "Other" && (
                    <textarea value={message} onChange={e=>setMessage(e.target.value)} placeholder="Please describe your reason..." rows={3}
                      style={{width:"100%",padding:"12px 14px",border:"1px solid #ddd",borderRadius:8,fontSize:14,resize:"none",outline:"none",boxSizing:"border-box"}} />
                  )}
                </div>
                <div style={{padding:"12px 16px",background:"#fff8f0",border:"1px solid #fde8cc",borderRadius:8,fontSize:12,color:"#a06020",marginBottom:16}}>
                  Your decline reason will be sent to both the capital advisor and borrower.
                </div>
              </>
            )}

            <button onClick={respond} disabled={submitting || (action==="decline"&&!declineReason)}
              style={{width:"100%",padding:16,background:action==="decline"?"#dc2626":navy,color:"white",border:"none",borderRadius:10,fontSize:15,fontWeight:700,cursor:"pointer",opacity:(submitting||(action==="decline"&&!declineReason))?0.5:1}}>
              {submitting ? "Submitting..." : action==="quote"?"Submit Quote":action==="info"?"Send Request":"Confirm Decline"}
            </button>
          </div>
        )}

        <div style={{textAlign:"center",marginTop:20,fontSize:11,color:"#bbb"}}>
          CapMoon, LLC · Lender Intelligence Platform · Confidential
        </div>
      </div>
    </div>
  );
}
