import { NextRequest, NextResponse } from "next/server";

// We'll generate the PDF as an HTML string and use a browser-friendly approach
// Since we're in Next.js edge/serverless, we'll return HTML that the client can print to PDF
// Or use the Anthropic API to generate a structured memo

export async function POST(req: NextRequest) {
  const body = await req.json();
  const { deal, memoFields, photos, activeSections, marketData } = body;

  const asset = deal?.assets?.[0];
  const today = new Date().toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" });

  // Generate HTML for the memo (client will window.print() it)
  const html = `<!DOCTYPE html>
<html>
<head>
<meta charset="UTF-8">
<title>${memoFields.dealTitle || "Deal Memo"}</title>
<style>
  @import url('https://fonts.googleapis.com/css2?family=Cormorant+Garamond:wght@400;600;700&family=Montserrat:wght@300;400;500;600&display=swap');
  * { margin: 0; padding: 0; box-sizing: border-box; }
  body { font-family: 'Montserrat', sans-serif; color: #1a1a2e; background: white; font-size: 10pt; line-height: 1.6; }
  .page { max-width: 850px; margin: 0 auto; padding: 60px 70px; }
  
  /* Header */
  .header { display: flex; align-items: center; justify-content: space-between; border-bottom: 3px solid #0a1f44; padding-bottom: 24px; margin-bottom: 32px; }
  .logo-area { display: flex; align-items: center; gap: 12px; }
  .logo-text { font-family: 'Cormorant Garamond', serif; font-size: 28pt; font-weight: 700; color: #0a1f44; }
  .logo-sub { font-size: 7pt; color: #c9a84c; letter-spacing: 0.3em; text-transform: uppercase; margin-top: 2px; }
  .header-right { text-align: right; }
  .memo-label { font-size: 7pt; letter-spacing: 0.3em; text-transform: uppercase; color: #c9a84c; font-weight: 600; }
  .memo-date { font-size: 9pt; color: #666; margin-top: 4px; }
  
  /* Title block */
  .title-block { background: #0a1f44; color: white; padding: 28px 32px; border-radius: 8px; margin-bottom: 32px; }
  .title-deal { font-family: 'Cormorant Garamond', serif; font-size: 22pt; font-weight: 700; color: white; margin-bottom: 8px; }
  .title-sub { font-size: 9pt; color: #c9a84c; letter-spacing: 0.15em; text-transform: uppercase; }
  .title-address { font-size: 10pt; color: rgba(255,255,255,0.8); margin-top: 6px; }
  
  /* Key stats */
  .stats-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 12px; margin-bottom: 32px; }
  .stat-box { border: 1.5px solid #c9a84c; border-radius: 6px; padding: 14px; text-align: center; }
  .stat-label { font-size: 7pt; color: #888; text-transform: uppercase; letter-spacing: 0.15em; margin-bottom: 4px; }
  .stat-value { font-size: 14pt; font-weight: 700; color: #0a1f44; font-family: 'Cormorant Garamond', serif; }
  
  /* Sections */
  .section { margin-bottom: 28px; }
  .section-title { font-size: 9pt; font-weight: 600; letter-spacing: 0.25em; text-transform: uppercase; color: #c9a84c; border-bottom: 1px solid #e5e7eb; padding-bottom: 6px; margin-bottom: 12px; }
  .section-content { font-size: 9.5pt; color: #333; line-height: 1.7; white-space: pre-wrap; }
  
  /* Advisor */
  .advisor-box { background: #f8f9fa; border-left: 4px solid #0a1f44; padding: 14px 18px; border-radius: 0 6px 6px 0; margin-top: 12px; }
  .advisor-name { font-weight: 600; color: #0a1f44; font-size: 10pt; }
  .advisor-detail { font-size: 8.5pt; color: #666; margin-top: 2px; }
  
  /* Market data */
  .market-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 10px; margin-top: 10px; }
  .market-item { background: #f8f9fa; border-radius: 4px; padding: 10px; }
  .market-key { font-size: 7.5pt; color: #888; text-transform: uppercase; letter-spacing: 0.1em; }
  .market-val { font-size: 10pt; font-weight: 600; color: #0a1f44; margin-top: 2px; }
  
  /* Photos */
  .photo-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 12px; margin-top: 12px; }
  .photo-item img { width: 100%; height: 140px; object-fit: cover; border-radius: 4px; }
  .photo-caption { font-size: 7.5pt; color: #888; text-align: center; margin-top: 4px; font-style: italic; }
  
  /* Footer */
  .footer { border-top: 1px solid #e5e7eb; padding-top: 16px; margin-top: 40px; display: flex; justify-content: space-between; align-items: center; }
  .footer-left { font-size: 7.5pt; color: #888; }
  .footer-right { font-size: 7.5pt; color: #888; text-align: right; }
  .footer-logo { font-family: 'Cormorant Garamond', serif; color: #0a1f44; font-weight: 700; font-size: 11pt; }
  .gold { color: #c9a84c; }
  
  /* Capital stack */
  .stack-row { display: flex; justify-content: space-between; padding: 6px 0; border-bottom: 1px solid #f0f0f0; font-size: 9pt; }
  .stack-label { color: #555; }
  .stack-value { font-weight: 600; color: #0a1f44; }
  
  @media print {
    .page { padding: 40px 50px; }
    body { print-color-adjust: exact; -webkit-print-color-adjust: exact; }
  }
</style>
</head>
<body>
<div class="page">

  <!-- Header -->
  <div class="header">
    <div class="logo-area">
      <div>
        <div class="logo-text">CapMoon</div>
        <div class="logo-sub">Lender Intelligence Platform</div>
      </div>
    </div>
    <div class="header-right">
      <div class="memo-label">Confidential Deal Memo</div>
      <div class="memo-date">${today}</div>
    </div>
  </div>

  <!-- Title Block -->
  <div class="title-block">
    <div class="title-sub">${memoFields.capitalType || deal?.capitalType || ""} · ${memoFields.assetType || asset?.assetType || ""} · ${memoFields.dealType || asset?.dealType || ""}</div>
    <div class="title-deal">${memoFields.dealTitle || deal?.seekerName || "Deal Memo"}</div>
    <div class="title-address">${memoFields.propertyAddress || ""}</div>
  </div>

  <!-- Key Stats -->
  <div class="stats-grid">
    ${[
      ["Loan Request", memoFields.loanAmount || asset?.loanAmount || "TBD"],
      ["Property Value", memoFields.propertyValue || asset?.propertyValue || "TBD"],
      ["LTV", memoFields.ltv || asset?.manualLtv || "TBD"],
      ["DSCR", memoFields.dscr || asset?.dscr || "TBD"],
    ].map(([label, val]) => `
      <div class="stat-box">
        <div class="stat-label">${label}</div>
        <div class="stat-value">${val}</div>
      </div>
    `).join("")}
  </div>

  <!-- Photos -->
  ${photos && photos.length > 0 && activeSections?.["Property Photos"] !== false ? `
  <div class="section">
    <div class="section-title">Property Photos</div>
    <div class="photo-grid">
      ${photos.map((p: any) => `
        <div class="photo-item">
          <img src="${p.url}" alt="${p.caption || "Property photo"}" />
          ${p.caption ? `<div class="photo-caption">${p.caption}</div>` : ""}
        </div>
      `).join("")}
    </div>
  </div>
  ` : ""}

  ${["Executive Summary", "Property Overview", "Capital Stack", "Market Overview", "Sponsor / Borrower Profile", "Financial Summary", "Lender Match Results"].filter(s => activeSections?.[s] !== false).map(section => {
    const fieldMap: Record<string, string> = {
      "Executive Summary": memoFields.executiveSummary,
      "Property Overview": memoFields.propertyOverview,
      "Capital Stack": memoFields.capitalStackSection,
      "Market Overview": memoFields.marketOverview,
      "Sponsor / Borrower Profile": memoFields.sponsorProfile,
      "Financial Summary": memoFields.financialSummary,
      "Lender Match Results": memoFields.lenderMatchResults || `Assigned Advisor: ${memoFields.advisorName || "TBD"}\nAdvisor Email: ${memoFields.advisorEmail || ""}\nAdvisor Phone: ${memoFields.advisorPhone || ""}`,
    };
    const content = fieldMap[section];
    if (!content) return "";
    return `
    <div class="section">
      <div class="section-title">${section}</div>
      <div class="section-content">${content}</div>
      ${section === "Market Overview" && marketData?.propertyData ? `
      <div class="market-grid">
        ${Object.entries(marketData.propertyData).map(([k, v]) => `
          <div class="market-item">
            <div class="market-key">${k}</div>
            <div class="market-val">${v}</div>
          </div>
        `).join("")}
      </div>` : ""}
    </div>`;
  }).join("")}

  <!-- Advisor -->
  ${memoFields.advisorName ? `
  <div class="section">
    <div class="section-title">CapMoon Advisory Team</div>
    <div class="advisor-box">
      <div class="advisor-name">${memoFields.advisorName}</div>
      ${memoFields.advisorEmail ? `<div class="advisor-detail">📧 ${memoFields.advisorEmail}</div>` : ""}
      ${memoFields.advisorPhone ? `<div class="advisor-detail">📞 ${memoFields.advisorPhone}</div>` : ""}
    </div>
  </div>` : ""}

  <!-- Footer -->
  <div class="footer">
    <div class="footer-left">
      <div class="footer-logo">CapMoon</div>
      <div>Confidential — For Authorized Recipients Only</div>
    </div>
    <div class="footer-right">
      <div>${today}</div>
      <div>This memo is for informational purposes only and does not constitute an offer to lend.</div>
    </div>
  </div>

</div>
<script>window.print();</script>
</body>
</html>`;

  return new NextResponse(html, {
    headers: {
      "Content-Type": "text/html",
      "Content-Disposition": `inline; filename="${(memoFields.dealTitle || "DealMemo").replace(/[^a-zA-Z0-9]/g, "_")}.html"`,
    },
  });
}
