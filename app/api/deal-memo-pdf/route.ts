import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  const body = await req.json();
  const { deal, memoFields, photos, activeSections, marketData } = body;
  const asset = deal?.assets?.[0];
  const today = new Date().toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" });
  const f = (key: string) => memoFields?.[key] || "";
  const stats: [string, string][] = [
    ["Loan Request", f("loanAmount") || asset?.loanAmount || "TBD"],
    ["Property Value", f("propertyValue") || asset?.propertyValue || "TBD"],
    ["LTV", f("ltv") || asset?.manualLtv || "TBD"],
    ["DSCR", f("dscr") || asset?.dscr || "TBD"],
  ];
  const sectionFields: Record<string, string> = {
    "Executive Summary": "executiveSummary",
    "Property Overview": "propertyOverview",
    "Capital Stack": "capitalStackSection",
    "Market Overview": "marketOverview",
    "Sponsor / Borrower Profile": "sponsorProfile",
    "Financial Summary": "financialSummary",
    "Lender Match Results": "lenderMatchResults",
  };
  const activeSectionList = Object.keys(sectionFields).filter(s => activeSections?.[s] !== false);
  const heroPhoto = photos?.[0];
  const photo2 = photos?.[1];
  const photo3 = photos?.[2];
  const stripPhotos = photos?.slice(3, 6) || [];
  const mktDemo = marketData?.demographics || {};
  const mktProp = marketData?.propertyData || {};
  const advisorName = f("advisorName");
  const advisorEmail = f("advisorEmail");
  const advisorPhone = f("advisorPhone");

  function photoDiv(photo: any, h: number, label: string, overlay?: string): string {
    if (photo?.url) {
      return `<div style="width:100%;height:${h}px;background:url('${photo.url}') center/cover no-repeat;position:relative;">
        ${photo.caption ? `<div style="position:absolute;bottom:0;left:0;right:0;padding:5px 12px;background:rgba(15,36,86,0.72);font-size:7.5px;color:rgba(255,255,255,0.85);">${photo.caption}</div>` : ""}
        ${overlay ? `<div style="position:absolute;bottom:0;left:0;right:0;padding:9px 32px;background:rgba(15,36,86,0.84);"><div style="font-size:8.5px;font-weight:700;letter-spacing:0.26em;text-transform:uppercase;color:white;">${overlay}</div></div>` : ""}
      </div>`;
    }
    return `<div style="height:${h}px;background:#c8d4e8;display:flex;align-items:center;justify-content:center;position:relative;">
      <div style="color:#8899bb;font-size:10px;letter-spacing:0.1em;text-transform:uppercase;">${label}</div>
      ${overlay ? `<div style="position:absolute;bottom:0;left:0;right:0;padding:9px 32px;background:rgba(15,36,86,0.84);"><div style="font-size:8.5px;font-weight:700;letter-spacing:0.26em;text-transform:uppercase;color:white;">${overlay}</div></div>` : ""}
    </div>`;
  }

  function sectionHeading(title: string, dark = false): string {
    const color = dark ? "rgba(255,255,255,0.5)" : "#0f2456";
    const border = dark ? "rgba(255,255,255,0.15)" : "#0f2456";
    return `<div style="font-size:8.5px;font-weight:700;letter-spacing:0.28em;text-transform:uppercase;color:${color};border-bottom:2px solid ${border};padding-bottom:7px;margin-bottom:14px;">${title}</div>`;
  }

  function dataBox(k: string, v: string, dark = false): string {
    const bg = dark ? "rgba(255,255,255,0.07)" : "#f4f6fb";
    const border = dark ? "1px solid rgba(255,255,255,0.12)" : "1px solid #dde3f0";
    const lc = dark ? "rgba(255,255,255,0.4)" : "#8899bb";
    const vc = dark ? "white" : "#0f2456";
    return `<div style="background:${bg};border:${border};border-radius:4px;padding:9px 10px;">
      <div style="font-size:7px;color:${lc};text-transform:uppercase;letter-spacing:0.12em;">${k}</div>
      <div style="font-size:11px;font-weight:700;color:${vc};margin-top:2px;">${v}</div>
    </div>`;
  }

  const html = `<!DOCTYPE html>
<html>
<head>
<meta charset="UTF-8">
<title>${f("dealTitle") || "CapMoon Deal Memo"}</title>
<link href="https://fonts.googleapis.com/css2?family=Montserrat:wght@300;400;500;600;700;800&display=swap" rel="stylesheet">
<style>
* { margin:0; padding:0; box-sizing:border-box; }
body { font-family:'Montserrat',sans-serif; background:white; color:#1a2f5e; -webkit-print-color-adjust:exact; print-color-adjust:exact; }
.wrap { max-width:900px; margin:0 auto; }
@media print { body { margin:0; } .wrap { max-width:100%; } }
</style>
</head>
<body>
<div class="wrap">

<div style="background:#0f2456;display:flex;min-height:220px;">
  <div style="width:40%;overflow:hidden;">${photoDiv(heroPhoto, 220, "Property Photo")}</div>
  <div style="flex:1;padding:28px 36px 28px 26px;display:flex;flex-direction:column;justify-content:center;position:relative;">
    <div style="position:absolute;right:0;top:0;bottom:0;width:30px;background:#0a1a3d;display:flex;align-items:center;justify-content:center;">
      <div style="transform:rotate(90deg);white-space:nowrap;font-size:6px;letter-spacing:0.22em;text-transform:uppercase;color:rgba(255,255,255,0.3);font-weight:600;">CAPMOON, LLC &nbsp;·&nbsp; STRUCTURED FINANCE &nbsp;·&nbsp; ${today}</div>
    </div>
    <div style="font-size:7px;letter-spacing:0.28em;text-transform:uppercase;color:rgba(255,255,255,0.4);margin-bottom:10px;">Confidential Deal Memo &nbsp;·&nbsp; ${today}</div>
    <div style="font-size:22px;font-weight:800;text-transform:uppercase;letter-spacing:0.05em;line-height:1.12;color:white;margin-bottom:12px;">${(f("dealTitle") || "Deal Memo").replace(" — ", "<br>").replace(" - ", "<br>")}</div>
    <div style="width:42px;height:2px;background:rgba(255,255,255,0.28);margin-bottom:12px;"></div>
    <div style="font-size:12px;color:rgba(255,255,255,0.75);">${f("capitalType") || deal?.capitalType || ""} &nbsp;·&nbsp; ${f("loanAmount") || asset?.loanAmount || ""}</div>
    <div style="font-size:10.5px;color:rgba(255,255,255,0.42);margin-top:5px;">${f("propertyAddress") || ""}</div>
  </div>
</div>

<div style="background:white;padding:17px 30px;border-bottom:3px solid #0f2456;">
  <div style="display:grid;grid-template-columns:repeat(4,1fr);gap:10px;">
    ${stats.map(([l, v]) => `<div style="border:1.5px solid #0f2456;border-radius:4px;padding:11px 8px;text-align:center;"><div style="font-size:7px;color:#6b7fa8;text-transform:uppercase;letter-spacing:0.15em;margin-bottom:4px;">${l}</div><div style="font-size:16px;font-weight:800;color:#0f2456;">${v}</div></div>`).join("")}
  </div>
</div>

${activeSectionList.includes("Executive Summary") ? `
<div style="display:flex;border-bottom:1px solid #e0e5f0;">
  <div style="width:42%;background:#0f2456;padding:26px 24px;">
    <div style="font-size:16px;font-weight:800;text-transform:uppercase;letter-spacing:0.06em;line-height:1.15;color:#c9a84c;margin-bottom:10px;">Executive<br>Summary</div>
    <div style="width:34px;height:2px;background:rgba(255,255,255,0.22);margin-bottom:14px;"></div>
    <div style="font-size:10.5px;line-height:1.8;color:rgba(255,255,255,0.75);white-space:pre-wrap;">${f("executiveSummary")}</div>
  </div>
  <div style="flex:1;display:flex;flex-direction:column;">
    ${photoDiv(photo2, 150, "Property Image")}
    <div style="padding:14px 18px;background:#f4f6fb;flex:1;">
      <div style="font-size:8px;font-weight:700;text-transform:uppercase;letter-spacing:0.18em;color:#0f2456;margin-bottom:8px;">Key Highlights</div>
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:6px;">
        ${[["Asset Type", f("assetType") || asset?.assetType || ""], ["Capital Type", f("capitalType") || deal?.capitalType || ""], ["Units", f("numUnits") || asset?.numUnits || ""], ["Recourse", f("recourse") || asset?.recourseType || ""]].filter(([,v]) => v).map(([k,v]) => `<div style="background:white;border-radius:3px;padding:6px 8px;border:1px solid #dde3f0;"><div style="font-size:7px;color:#8899bb;text-transform:uppercase;letter-spacing:0.1em;">${k}</div><div style="font-size:10.5px;font-weight:700;color:#0f2456;margin-top:1px;">${v}</div></div>`).join("")}
      </div>
    </div>
  </div>
</div>` : ""}

${activeSectionList.includes("Property Overview") ? `
<div style="border-bottom:1px solid #e0e5f0;">
  ${photoDiv(photo3, 100, "Property Image", "Property Overview")}
  <div style="padding:20px 30px 24px;display:grid;grid-template-columns:1fr 1fr;gap:22px;">
    <div style="font-size:10.5px;line-height:1.8;color:#3d4f75;white-space:pre-wrap;">${f("propertyOverview")}</div>
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:7px;align-content:start;">
      ${[["Address", f("propertyAddress")], ["Asset Type", f("assetType")], ["Deal Type", f("dealType")], ["Units", f("numUnits")], ["NOI", f("currentNetIncome")], ["Recourse", f("recourse")]].filter(([,v]) => v).map(([k,v]) => dataBox(k, v)).join("")}
    </div>
  </div>
</div>` : ""}

${stripPhotos.length > 0 ? `<div style="display:grid;grid-template-columns:repeat(${Math.min(stripPhotos.length,3)},1fr);border-bottom:1px solid #e0e5f0;">${stripPhotos.slice(0,3).map((p: any, i: number) => `<div>${photoDiv(p, 100, "Photo " + (i+4))}</div>`).join("")}</div>` : ""}

${activeSectionList.includes("Capital Stack") ? `
<div style="background:#0f2456;padding:24px 30px;border-bottom:1px solid #1a3168;">
  ${sectionHeading("Capital Stack", true)}
  <div style="font-size:10.5px;line-height:1.8;color:rgba(255,255,255,0.75);white-space:pre-wrap;margin-bottom:14px;">${f("capitalStackSection")}</div>
  <div style="display:grid;grid-template-columns:repeat(4,1fr);gap:9px;">${stats.map(([k,v]) => dataBox(k, v, true)).join("")}</div>
</div>` : ""}

${activeSectionList.includes("Market Overview") ? `
<div style="border-bottom:1px solid #e0e5f0;">
  <div style="padding:24px 30px;">
    ${sectionHeading("Market Overview")}
    <div style="font-size:10.5px;line-height:1.8;color:#3d4f75;margin-bottom:14px;white-space:pre-wrap;">${f("marketOverview")}</div>
    ${Object.keys(mktDemo).length > 0 || Object.keys(mktProp).length > 0 ? `<div style="display:grid;grid-template-columns:repeat(3,1fr);gap:7px;">${[...Object.entries(mktDemo), ...Object.entries(mktProp)].filter(([,v]) => v).slice(0,9).map(([k,v]) => dataBox(k, String(v))).join("")}</div>` : ""}
  </div>
</div>` : ""}

${activeSectionList.includes("Financial Summary") ? `
<div style="border-bottom:1px solid #e0e5f0;padding:24px 30px;">
  ${sectionHeading("Financial Summary")}
  <div style="font-size:10.5px;line-height:1.8;color:#3d4f75;white-space:pre-wrap;">${f("financialSummary")}</div>
</div>` : ""}

${activeSectionList.includes("Sponsor / Borrower Profile") ? `
<div style="padding:24px 30px;border-bottom:1px solid #e0e5f0;">
  ${sectionHeading("Sponsor / Borrower Profile")}
  <div style="font-size:10.5px;line-height:1.8;color:#3d4f75;white-space:pre-wrap;">${f("sponsorProfile")}</div>
</div>` : ""}

${activeSectionList.includes("Lender Match Results") && f("lenderMatchResults") ? `
<div style="padding:24px 30px;border-bottom:1px solid #e0e5f0;">
  ${sectionHeading("Lender Match Results")}
  <div style="font-size:10.5px;line-height:1.8;color:#3d4f75;white-space:pre-wrap;">${f("lenderMatchResults")}</div>
</div>` : ""}

${advisorName ? `
<div style="display:flex;border-bottom:1px solid #1a3168;">
  <div style="background:#0f2456;padding:22px 26px;display:flex;align-items:center;gap:16px;min-width:300px;">
    <div style="width:58px;height:58px;border-radius:50%;overflow:hidden;border:2px solid rgba(255,255,255,0.2);flex-shrink:0;background:#1a3168;">
      ${(() => {
        const lower = advisorName.toLowerCase();
        const photo = lower.includes("louis") ? "/louis.jpg" : lower.includes("shuvo") ? "/Shuvo.jpeg" : null;
        return photo
          ? `<img src="${photo}" style="width:100%;height:100%;object-fit:cover;" />`
          : `<div style="width:100%;height:100%;display:flex;align-items:center;justify-content:center;font-size:18px;font-weight:800;color:rgba(255,255,255,0.45);">${advisorName.split(" ").map((n: string) => n[0]).join("").slice(0,2)}</div>`;
      })()}
    </div>
    <div>
      <div style="font-size:7px;letter-spacing:0.22em;text-transform:uppercase;color:#c9a84c;margin-bottom:4px;">Capital Advisor</div>
      <div style="font-size:13px;font-weight:800;color:white;">${advisorName}</div>
      ${advisorEmail ? `<div style="font-size:9.5px;color:rgba(255,255,255,0.52);margin-top:3px;">${advisorEmail}</div>` : ""}
      ${advisorPhone ? `<div style="font-size:9.5px;color:rgba(255,255,255,0.52);">${advisorPhone}</div>` : ""}
    </div>
  </div>
  <div style="flex:1;background:#f4f6fb;padding:22px 26px;display:flex;flex-direction:column;justify-content:center;">
    <div style="font-size:8px;font-weight:700;letter-spacing:0.2em;text-transform:uppercase;color:#0f2456;margin-bottom:6px;">CapMoon, LLC</div>
    <div style="font-size:10.5px;color:#3d4f75;line-height:1.7;">Structured Finance &nbsp;·&nbsp; Capital Advisory &nbsp;·&nbsp; Lender Intelligence<br>Over $1.5B in closings since inception</div>
  </div>
</div>` : ""}

<div style="background:#0f2456;padding:16px 30px;display:flex;align-items:center;justify-content:space-between;">
  <div>
    <div style="font-size:18px;font-weight:800;color:white;letter-spacing:0.04em;">CapMoon</div>
    <div style="font-size:6.5px;letter-spacing:0.2em;text-transform:uppercase;color:rgba(255,255,255,0.3);">Lender Intelligence Platform</div>
  </div>
  <div style="text-align:right;">
    <div style="font-size:7px;color:rgba(255,255,255,0.32);">${today} &nbsp;·&nbsp; Confidential — For Authorized Recipients Only</div>
    <div style="font-size:7px;color:rgba(255,255,255,0.22);margin-top:2px;">This memo is for informational purposes only and does not constitute an offer to lend.</div>
  </div>
</div>

</div>
<script>window.print();</script>
</body>
</html>`;

  return new NextResponse(html, {
    headers: {
      "Content-Type": "text/html",
      "Content-Disposition": `inline; filename="${(f("dealTitle") || "DealMemo").replace(/[^a-zA-Z0-9]/g, "_")}.html"`,
    },
  });
}
