import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  const body = await req.json();
  const { deal, memoFields, activeSections, marketData } = body;
  const today = new Date().toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" });
  const f = (key: string) => memoFields?.[key] || "";

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
  const mktDemo = marketData?.demographics || {};
  const mktProp = marketData?.propertyData || {};
  const advisorName = f("advisorName");
  const advisorEmail = f("advisorEmail");
  const advisorPhone = f("advisorPhone");

  function esc(s: string): string {
    return (s || "").replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;").replace(/\n/g,"</w:t><w:br/><w:t xml:space=\"preserve\">");
  }

  function para(text: string, style = "Normal", bold = false, size = 20, color = "000000"): string {
    return `<w:p><w:pPr><w:pStyle w:val="${style}"/></w:pPr><w:r><w:rPr>${bold?"<w:b/>":""}<w:sz w:val="${size}"/><w:color w:val="${color}"/></w:rPr><w:t xml:space="preserve">${esc(text)}</w:t></w:r></w:p>`;
  }

  function heading(text: string): string {
    return `<w:p><w:pPr><w:pBdr><w:bottom w:val="single" w:sz="6" w:space="1" w:color="0f2456"/></w:pBdr><w:spacing w:before="240" w:after="120"/></w:pPr><w:r><w:rPr><w:b/><w:sz w:val="22"/><w:color w:val="0f2456"/><w:spacing w:val="80"/></w:rPr><w:t>${esc(text.toUpperCase())}</w:t></w:r></w:p>`;
  }

  function statRow(label: string, value: string): string {
    return `<w:tr>
      <w:tc><w:tcPr><w:tcW w:w="3000" w:type="dxa"/><w:shd w:val="clear" w:color="auto" w:fill="f4f6fb"/></w:tcPr><w:p><w:r><w:rPr><w:sz w:val="18"/><w:color w:val="6b7fa8"/></w:rPr><w:t>${esc(label)}</w:t></w:r></w:p></w:tc>
      <w:tc><w:tcPr><w:tcW w:w="3000" w:type="dxa"/><w:shd w:val="clear" w:color="auto" w:fill="f4f6fb"/></w:tcPr><w:p><w:r><w:rPr><w:b/><w:sz w:val="22"/><w:color w:val="0f2456"/></w:rPr><w:t>${esc(value)}</w:t></w:r></w:p></w:tc>
    </w:tr>`;
  }

  const stats = [
    ["Loan Request", f("loanAmount") || "TBD"],
    ["Property Value", f("propertyValue") || "TBD"],
    ["LTV", f("ltv") || "TBD"],
    ["DSCR", f("dscr") || "TBD"],
    ["Asset Type", f("assetType") || "TBD"],
    ["Capital Type", f("capitalType") || "TBD"],
  ];

  const allMarketData = [...Object.entries(mktDemo), ...Object.entries(mktProp)].filter(([,v]) => v);

  const bodyXml = `
    ${para("CAPMOON, LLC  ·  STRUCTURED FINANCE  ·  CONFIDENTIAL", "Normal", false, 16, "8899bb")}
    ${para(today, "Normal", false, 16, "8899bb")}
    <w:p><w:pPr><w:spacing w:before="320"/></w:pPr><w:r><w:rPr><w:b/><w:sz w:val="40"/><w:color w:val="0f2456"/></w:rPr><w:t>${esc(f("dealTitle") || "Deal Memo")}</w:t></w:r></w:p>
    ${para(f("propertyAddress") || "", "Normal", false, 20, "3d4f75")}
    ${para((f("capitalType") || "") + (f("loanAmount") ? "  ·  " + f("loanAmount") : ""), "Normal", true, 20, "c9a84c")}

    <w:p><w:pPr><w:pBdr><w:bottom w:val="single" w:sz="12" w:space="1" w:color="0f2456"/></w:pBdr><w:spacing w:before="240" w:after="240"/></w:pPr></w:p>

    ${heading("Key Deal Metrics")}
    <w:tbl>
      <w:tblPr><w:tblW w:w="9000" w:type="dxa"/><w:tblBorders><w:insideH w:val="single" w:sz="4" w:color="e0e5f0"/><w:insideV w:val="none"/></w:tblBorders></w:tblPr>
      <w:tblGrid><w:gridCol w:w="3000"/><w:gridCol w:w="3000"/></w:tblGrid>
      ${stats.filter(([,v])=>v!=="TBD"&&v).map(([l,v]) => statRow(l, v)).join("")}
    </w:tbl>
    <w:p><w:pPr><w:spacing w:after="240"/></w:pPr></w:p>

    ${activeSectionList.map(section => {
      const content = f(sectionFields[section]);
      if (!content) return "";
      return `
        ${heading(section)}
        ${para(content, "Normal", false, 20, "3d4f75")}
        ${section === "Market Overview" && allMarketData.length > 0 ? `
          <w:p><w:pPr><w:spacing w:before="120" w:after="60"/></w:pPr><w:r><w:rPr><w:b/><w:sz w:val="18"/><w:color w:val="0f2456"/></w:rPr><w:t>Market Data</w:t></w:r></w:p>
          <w:tbl><w:tblPr><w:tblW w:w="9000" w:type="dxa"/></w:tblPr><w:tblGrid><w:gridCol w:w="4000"/><w:gridCol w:w="5000"/></w:tblGrid>
          ${allMarketData.slice(0,8).map(([k,v]) => statRow(k, String(v))).join("")}
          </w:tbl>
        ` : ""}
        <w:p><w:pPr><w:spacing w:after="160"/></w:pPr></w:p>
      `;
    }).join("")}

    ${advisorName ? `
      ${heading("CapMoon Advisory Team")}
      ${para(advisorName, "Normal", true, 22, "0f2456")}
      ${advisorEmail ? para(advisorEmail, "Normal", false, 18, "3d4f75") : ""}
      ${advisorPhone ? para(advisorPhone, "Normal", false, 18, "3d4f75") : ""}
      <w:p><w:pPr><w:spacing w:after="160"/></w:pPr></w:p>
    ` : ""}

    <w:p><w:pPr><w:pBdr><w:top w:val="single" w:sz="6" w:space="1" w:color="0f2456"/></w:pPr><w:spacing w:before="240"/></w:pPr>
      <w:r><w:rPr><w:sz w:val="16"/><w:color w:val="8899bb"/></w:rPr>
      <w:t>CapMoon, LLC  ·  Lender Intelligence Platform  ·  Confidential  ·  ${today}</w:t></w:r>
    </w:p>
    ${para("This memo is for informational purposes only and does not constitute an offer to lend.", "Normal", false, 14, "aab3cc")}
  `;

  const docx = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<w:document xmlns:wpc="http://schemas.microsoft.com/office/word/2010/wordprocessingCanvas"
  xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"
  xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships">
  <w:body>
    <w:sectPr>
      <w:pgSz w:w="12240" w:h="15840"/>
      <w:pgMar w:top="1440" w:right="1440" w:bottom="1440" w:left="1440"/>
    </w:sectPr>
    ${bodyXml}
  </w:body>
</w:document>`;

  // Return as RTF (universally openable in Word/Pages/LibreOffice)
  const rtf = buildRtf(f, stats, activeSectionList, sectionFields, memoFields, allMarketData, advisorName, advisorEmail, advisorPhone, today);

  return new NextResponse(rtf, {
    headers: {
      "Content-Type": "application/msword",
      "Content-Disposition": `attachment; filename="${(f("dealTitle") || "DealMemo").replace(/[^a-zA-Z0-9]/g, "_")}.doc"`,
    },
  });
}

function buildRtf(f: Function, stats: string[][], activeSectionList: string[], sectionFields: Record<string,string>, memoFields: any, allMarketData: any[], advisorName: string, advisorEmail: string, advisorPhone: string, today: string): string {
  const e = (s: string) => (s||"").replace(/\\/g,"\\\\").replace(/\{/g,"\\{").replace(/\}/g,"\\}").replace(/\n/g,"\\line ");

  const lines: string[] = [
    "{\\rtf1\\ansi\\ansicpg1252\\deff0",
    "{\\fonttbl{\\f0\\froman\\fcharset0 Times New Roman;}{\\f1\\fswiss\\fcharset0 Arial;}}",
    "{\\colortbl ;\\red15\\green36\\blue86;\\red201\\green168\\blue76;\\red61\\green79\\blue117;\\red136\\green153\\blue187;}",
    "\\paperw12240\\paperh15840\\margl1440\\margr1440\\margt1440\\margb1440\\widowctrl",
    // Header
    `\\f1\\fs16\\cf4 CAPMOON, LLC  \\bullet  STRUCTURED FINANCE  \\bullet  CONFIDENTIAL\\par`,
    `\\fs16\\cf4 ${e(today)}\\par\\par`,
    // Title
    `\\f1\\fs42\\b\\cf1 ${e(f("dealTitle") || "Deal Memo")}\\par`,
    `\\fs20\\b0\\cf3 ${e(f("propertyAddress") || "")}\\par`,
    `\\fs20\\b\\cf2 ${e((f("capitalType")||"") + (f("loanAmount") ? "  ·  " + f("loanAmount") : ""))}\\par\\par`,
    // Divider
    `\\brdrb\\brdrs\\brdrw15\\brdrcolor0f2456\\par\\par`,
    // Stats heading
    `\\f1\\fs19\\b\\cf1\\kerning80 KEY DEAL METRICS\\par`,
    `\\brdrb\\brdrs\\brdrw8\\brdrcolor0f2456\\par`,
    // Stats table
    ...stats.filter(([,v])=>v&&v!=="TBD").map(([l,v]) =>
      `\\trowd\\trgaph100\\cellx4320\\cellx8640\\intbl\\f1\\fs17\\cf4 ${e(l)}\\cell\\b\\cf1 ${e(v)}\\b0\\cell\\row`
    ),
    "\\par",
    // Sections
    ...activeSectionList.flatMap(section => {
      const content = (memoFields?.[sectionFields[section]] || "");
      if (!content) return [];
      const lines = [
        `\\f1\\fs19\\b\\cf1\\kerning80 ${e(section.toUpperCase())}\\par`,
        `\\brdrb\\brdrs\\brdrw8\\brdrcolor0f2456\\par`,
        `\\f0\\fs20\\b0\\cf3\\kerning0 ${e(content)}\\par\\par`,
      ];
      if (section === "Market Overview" && allMarketData.length > 0) {
        lines.push(`\\f1\\fs17\\b\\cf1 Market Data\\par\\b0`);
        allMarketData.slice(0,8).forEach(([k,v]) => {
          lines.push(`\\trowd\\trgaph100\\cellx4320\\cellx8640\\intbl\\f1\\fs17\\cf4 ${e(k)}\\cell\\b\\cf1 ${e(String(v))}\\b0\\cell\\row`);
        });
        lines.push("\\par");
      }
      return lines;
    }),
    // Advisor
    ...(advisorName ? [
      `\\f1\\fs19\\b\\cf1\\kerning80 CAPMOON ADVISORY TEAM\\par`,
      `\\brdrb\\brdrs\\brdrw8\\brdrcolor0f2456\\par`,
      `\\f1\\fs22\\b\\cf1 ${e(advisorName)}\\par`,
      advisorEmail ? `\\f1\\fs18\\b0\\cf3 ${e(advisorEmail)}\\par` : "",
      advisorPhone ? `\\f1\\fs18\\cf3 ${e(advisorPhone)}\\par` : "",
      "\\par",
    ] : []),
    // Footer
    `\\brdrb\\brdrs\\brdrw6\\brdrcolor0f2456\\par`,
    `\\f1\\fs15\\cf4 CapMoon, LLC  \\bullet  Lender Intelligence Platform  \\bullet  Confidential  \\bullet  ${e(today)}\\par`,
    `\\fs14\\cf4 This memo is for informational purposes only and does not constitute an offer to lend.\\par`,
    "}",
  ];
  return lines.join("\n");
}
