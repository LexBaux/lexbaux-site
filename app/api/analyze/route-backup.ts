// app/api/analyze/route.ts
import { NextRequest, NextResponse } from "next/server";

// @ts-ignore - on précharge le module du worker pour que Next le bundle côté serveur
import "pdfjs-dist/build/pdf.worker.mjs";

// Exécution côté Node
export const runtime = "nodejs";

// ---- Shim DOM-only API manquante dans Node (pas de redéclaration TS !) ----
// On ne redéclare pas le type, on affecte seulement si absent.
if (!(globalThis as any).DOMMatrix) {
  class DOMMatrixShim {
    a = 1; b = 0; c = 0; d = 1; e = 0; f = 0;
    multiplySelf() { return this; }
    preMultiplySelf() { return this; }
    translateSelf() { return this; }
    scaleSelf() { return this; }
    rotateSelf() { return this; }
    invertSelf() { return this; }
    multiply() { return this; }
    translate() { return this; }
    scale() { return this; }
    rotate() { return this; }
    inverse() { return this; }
    transformPoint(p: any) { return p; }
  }
  (globalThis as any).DOMMatrix = DOMMatrixShim as any;
}

// ==============  PDF -> texte (via pdfjs-dist)  ==============
async function extractTextFromPdf(
  pdfBuffer: Buffer | ArrayBuffer
): Promise<{ text: string; pagesCount: number; info?: Record<string, any> }> {
  // Toujours un Buffer Node -> Uint8Array pour pdfjs
  const buf = Buffer.isBuffer(pdfBuffer) ? pdfBuffer : Buffer.from(pdfBuffer);
  const uint8 = new Uint8Array(buf);

// Import pdfjs (ESM) — on ne touche PAS à GlobalWorkerOptions ici
const pdfjs: any = await import("pdfjs-dist/build/pdf.mjs");

// Ouvre le document ; le worker “fake” fonctionnera car on a pré-importé le module
const loadingTask = pdfjs.getDocument({ data: uint8 });
const pdf = await loadingTask.promise;


  // Concatène le texte de toutes les pages
  let fullText = "";
  for (let i = 1; i <= pdf.numPages; i++) {
    const page = await pdf.getPage(i);
    const content = await page.getTextContent();
    const pageText = (content.items as any[])
      .map((item: any) => ("str" in item ? item.str : (item?.item?.str ?? "")))
      .join(" ");
    fullText += pageText + "\n\n";
  }

  const text = fullText.replace(/\u0000/g, "").trim();
  return { text, pagesCount: pdf.numPages, info: {} };
}

/* ====================== Utils ====================== */
function firstMatch(re: RegExp, s: string): string | null {
  const m = s.match(re);
  return m ? (m[1] ?? m[0]) : null;
}

type Finding = {
  id: string;
  title: string;
  severity: "info" | "warn" | "high";
  detail: string;
  advice?: string;   // (optionnel) conseil pratique
  tags?: string[];   // (optionnel) mots-clés
  where?: string[];  // rétro-compat pour l’ancien code
};


/* ========== Analyse heuristique (démo longue) ========== */
function analyzeText(raw: string) {
  const text = raw.toLowerCase();

  // Métadonnées simples
  const pagesCountGuess = Math.max(1, Math.round(raw.split(/\f|\n\s*\n/g).length / 2));
  const title =
    firstMatch(/(bail commercial|contrat de bail|bail.*locatif)/i, raw) ??
    "Bail (titre non détecté)";

  // Durée
  const duree9 = /9\s*(ans| années)/i.test(raw);
  const duree12 = /12\s*(ans| années)/i.test(raw);
  const duree = firstMatch(/(\d+)\s*(ans| années)/i, raw);
  let dureeNote = "Durée non trouvée.";
  if (duree9) dureeNote = "Durée 9 ans détectée (classique).";
  else if (duree12) dureeNote = "Durée 12 ans détectée (attention aux sorties).";
  else if (duree) dureeNote = `Durée ${duree} détectée.`;

  // Indexation
  const hasICC = /indice.*(icc)/i.test(raw);
  const hasILC = /indice.*(ilc)/i.test(raw);
  const hasILAT = /indice.*(ilat)/i.test(raw);
  const indexPlaf = /(plafond|plafonnée|plafonnement|cap.*)/i.test(raw);
  let indexLabel: string | null = null;
  if (hasILC) indexLabel = "ILC";
  else if (hasILAT) indexLabel = "ILAT";
  else if (hasICC) indexLabel = "ICC";

  // Charges / grosses réparations / taxe foncière
  const mentionsCharges = /charges/i.test(raw);
  const grossesRep = /(grosses? réparations|article\s*606)/i.test(raw);
  const taxeFonc = /(taxe\s*foncière)/i.test(raw);

  // Dépôt / pénalités / cession / destination
  const depot = firstMatch(/dép[oô]t\s+de\s+garantie[^0-9]*(\d+[.,]?\d*)/i, raw);
  const penalites = /(pénalit|retard\s+intérêts)/i.test(raw);
  const cessionRestr = /(cession|sous-?location).*(interdit|soumis|autorisation)/i.test(text);
  const destination = firstMatch(/(destination|usage)\s*:\s*([^\n]+)/i, raw);

  // Clauses sensibles
  const resolutoire = /(clause\s+résolutoire|résiliation\s+de\s+plein\s+droit)/i.test(raw);
  const preavisLong = /(préavis).{0,20}(\d{2}\s*mois|un\s*an)/i.test(raw);
  const nonConcurrence = /(non[-\s]?concurrence)/i.test(raw);

  // Score “risques”
  let riskScore = 0;
  if (indexLabel === "ICC") riskScore += 0.25;
  if (!indexPlaf) riskScore += 0.15;
  if (grossesRep) riskScore += 0.25;
  if (taxeFonc) riskScore += 0.15;
  if (resolutoire) riskScore += 0.15;
  riskScore = Math.min(1, riskScore);

  const findings: Finding[] = [];

  findings.push({
    id: "duration",
    title: "Durée du bail",
    severity: "info",
    detail: dureeNote,
  });

  if (indexLabel) {
    findings.push({
      id: "index",
      title: "Indexation du loyer",
      severity: indexLabel === "ICC" ? "warn" : "info",
      detail: `Index repéré : ${indexLabel}${indexPlaf ? " (avec plafonnement/cap)" : " (plafonnement non clair)"}.`,
      where: ["indice", "indexation", "révision"],
    });
  } else {
    findings.push({
      id: "index-missing",
      title: "Indexation non détectée",
      severity: "warn",
      detail: "Aucune clause d’indexation claire détectée (à vérifier).",
    });
  }

  if (mentionsCharges) {
    findings.push({
      id: "charges",
      title: "Charges récupérables",
      severity: grossesRep ? "high" : taxeFonc ? "warn" : "info",
      detail:
        grossesRep
          ? "Mention d’« article 606 » ou « grosses réparations » : semble à la charge du locataire."
          : taxeFonc
          ? "La taxe foncière semble récupérée sur le locataire."
          : "Charges mentionnées (détail à vérifier).",
      where: ["charges", "réparations", "606", "taxe foncière"],
    });
  }

  if (depot) {
    findings.push({
      id: "deposit",
      title: "Dépôt de garantie",
      severity: "info",
      detail: `Montant repéré : ${depot} (à confirmer).`,
      where: ["dépôt de garantie"],
    });
  }

  if (penalites) {
    findings.push({
      id: "penalties",
      title: "Pénalités de retard / intérêts",
      severity: "warn",
      detail: "Clause de pénalités repérée (taux/conditions à vérifier).",
      where: ["pénalités", "intérêts de retard"],
    });
  }

  if (cessionRestr) {
    findings.push({
      id: "assignment",
      title: "Cession / sous-location",
      severity: "warn",
      detail: "Des restrictions à la cession/sous-location semblent présentes.",
      where: ["cession", "sous-location", "autorisation"],
    });
  }

  if (destination) {
    findings.push({
      id: "destination",
      title: "Destination des locaux",
      severity: "info",
      detail: `Destination indiquée : ${destination}.`,
      where: ["destination", "usage"],
    });
  }

  if (resolutoire) {
    findings.push({
      id: "resolutory",
      title: "Clause résolutoire",
      severity: "warn",
      detail: "Clause résolutoire détectée : résiliation automatique en cas de manquement.",
    });
  }

  if (preavisLong) {
    findings.push({
      id: "notice",
      title: "Préavis inhabituel",
      severity: "warn",
      detail: "Préavis long détecté (≥ 6 mois). Vérifier si déséquilibré.",
    });
  }

  if (nonConcurrence) {
    findings.push({
      id: "noncompete",
      title: "Non-concurrence",
      severity: "warn",
      detail: "Clause de non-concurrence repérée : peut limiter l’activité.",
    });
  }

  const summary = {
    riskScore,
    riskLevel: riskScore >= 0.66 ? "élevé" : riskScore >= 0.33 ? "moyen" : "modéré",
    highlights: [
      indexLabel ? `Indexation: ${indexLabel}${indexPlaf ? " (cap)" : ""}` : "Indexation non détectée",
      grossesRep ? "606 potentiellement à la charge du locataire" : undefined,
      taxeFonc ? "Taxe foncière récupérée" : undefined,
      resolutoire ? "Clause résolutoire" : undefined,
    ].filter(Boolean),
  };

  return {
    meta: { title, pages: pagesCountGuess, indexation: indexLabel, plafonnement: indexPlaf },
    findings,
    summary,
  };
}

/* ================= Handler POST ================= */
export async function POST(req: NextRequest) {
  try {
    const form = await req.formData();
    const file = form.get("file");

    if (!(file instanceof File)) {
      return NextResponse.json({ error: "Aucun fichier reçu" }, { status: 400 });
    }

    // File -> Buffer
    const ab = await file.arrayBuffer();
    const buf = Buffer.from(ab);

    // Extraction
    const { text, pagesCount } = await extractTextFromPdf(buf);

    if (!text || text.trim().length < 40) {
      return NextResponse.json(
        { error: "Le PDF ne contient pas de texte exploitable. S’agit-il d’un scan sans OCR ?" },
        { status: 400 }
      );
    }

    // Analyse métier
    const report = analyzeText(text);
    (report as any).meta = { ...(report as any).meta, pages: pagesCount, filename: file.name };

    return NextResponse.json(report, { status: 200 });
  } catch (e: any) {
    console.error("[analyze] ERROR:", e);
    return NextResponse.json({ error: e?.message || "Erreur serveur" }, { status: 500 });
  }
}
