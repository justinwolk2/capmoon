"use client";
import { useEffect, useState } from "react";

export default function LenderDealPage({ params }: { params: { token: string } }) {
  const { token } = params;
  const [data, setData] = useState<any>(null);
  const [message, setMessage] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/lender-submissions?token=" + token)
      .then(r => r.json())
      .then(d => { setData(d); setLoading(false); });
  }, [token]);

  async function respond(s: string) {
    await fetch("/api/lender-submissions", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "respond", token, status: s, message })
    });
    setSubmitted(true);
  }

  if (loading) return (
    <div style={{display:"flex",alignItems:"center",justifyContent:"center",minHeight:"100vh",fontFamily:"Montserrat,sans-serif",background:"#f0f2f5",color:"#666",fontSize:16}}>
      Loading deal...
    </div>
  );

  if (!data || data.error) return (
    <div style={{display:"flex",alignItems:"center",justifyContent:"center",minHeight:"100vh",fontFamily:"Montserrat,sans-serif",color:"#666"}}>
      Invalid or expired link.
    </div>
  );

  return (
    <div style={{minHeight:"100vh",background:"#f0f2f5",fontFamily:"Montserrat,sans-serif",padding:"40px 20px"}}>
      <div style={{maxWidth:680,margin:"0 auto"}}>
        <div style={{background:"#0a1f44",borderRadius:12,padding:"28px 32px",marginBottom:24}}>
          <div style={{fontSize:10,letterSpacing:"0.25em",textTransform:"uppercase",color:"rgba(255,255,255,0.4)",marginBottom:8}}>CapMoon · Deal Opportunity</div>
          <div style={{fontSize:22,fontWeight:800,color:"white",marginBottom:6}}>{data.deal_title}</div>
          <div style={{fontSize:12,color:"rgba(255,255,255,0.55)"}}>Presented by {data.advisor_name}</div>
        </div>
        {submitted ? (
          <div style={{background:"white",borderRadius:12,padding:40,textAlign:"center"}}>
            <div style={{fontSize:40,marginBottom:16}}>✓</div>
            <div style={{fontSize:18,fontWeight:700,color:"#0a1f44",marginBottom:8}}>Thank you for your response</div>
            <div style={{fontSize:14,color:"#666"}}>The CapMoon team has been notified.</div>
          </div>
        ) : (
          <div style={{background:"white",borderRadius:12,padding:32}}>
            <p style={{fontSize:14,color:"#333",lineHeight:1.7,marginBottom:20}}>
              You have received a financing opportunity from <strong>CapMoon</strong>. Please review and let us know how you would like to proceed.
            </p>
            <div style={{marginBottom:16}}>
              <label style={{fontSize:12,color:"#888",display:"block",marginBottom:6,textTransform:"uppercase",letterSpacing:"0.1em"}}>Message (optional)</label>
              <textarea value={message} onChange={e=>setMessage(e.target.value)} placeholder="Add any questions or comments..." rows={3}
                style={{width:"100%",padding:"12px 14px",border:"1px solid #ddd",borderRadius:8,fontSize:14,resize:"none",outline:"none",boxSizing:"border-box"}} />
            </div>
            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:12}}>
              <button onClick={()=>respond("info_requested")}
                style={{padding:14,background:"#0a1f44",color:"white",border:"none",borderRadius:8,fontSize:14,fontWeight:700,cursor:"pointer"}}>
                Request More Info
              </button>
              <button onClick={()=>respond("declined")}
                style={{padding:14,background:"white",color:"#888",border:"2px solid #eee",borderRadius:8,fontSize:14,fontWeight:700,cursor:"pointer"}}>
                Decline
              </button>
            </div>
          </div>
        )}
        <div style={{textAlign:"center",marginTop:20,fontSize:11,color:"#bbb"}}>
          CapMoon, LLC · Lender Intelligence Platform · Confidential
        </div>
      </div>
    </div>
  );
}
