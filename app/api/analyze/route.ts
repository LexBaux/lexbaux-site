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

  // ——— Métadonnées rapides
  const pagesCountGuess = Math.max(1, Math.round(raw.split(/\f|\n\s*\n/g).length / 2));
  const title =
    firstMatch(/(bail commercial|contrat de bail|bail.*locatif)/i, raw) ??
    "Bail (titre non détecté)";

  // ——— Durée
  const duree9 = /9\s*(ans|années)/i.test(raw);
  const duree12 = /12\s*(ans|années)/i.test(raw);
  const duree = firstMatch(/(\d+)\s*(ans|années)/i, raw);
  let dureeNote = "Durée non trouvée.";
  if (duree9) dureeNote = "Durée 9 ans détectée (classique).";
  else if (duree12) dureeNote = "Durée 12 ans détectée (attention aux sorties).";
  else if (duree) dureeNote = `Durée ${duree} détectée.`;

  // ——— Indexation
  const hasICC = /indice.*\bicc\b/i.test(text);
  const hasILC = /indice.*\bilc\b/i.test(text);
  const hasILAT = /indice.*\bilat\b/i.test(text);
  const indexPlaf = /(plafond|plafonnée|plafonnement|cap(?:ping)?)/i.test(raw);
  const indexPeriod = firstMatch(/\b(annuelle|trimestrielle|semestrielle)\b/i, raw);
  const indexOneWay = /indexation[^.\n]+(seulement|uniquement)[^.\n]+(hausse|augmentation)/i.test(text); // hausse seule (clause cliquet)
  let indexLabel: string | null = null;
  if (hasILC) indexLabel = "ILC";
  else if (hasILAT) indexLabel = "ILAT";
  else if (hasICC) indexLabel = "ICC";

  // ——— Charges / travaux / taxes
  const grossesRep = /(grosses?\s+r[eé]parations|article\s*606)/i.test(raw);
  const taxeFonc = /(taxe\s*fonci[eè]re)/i.test(raw);
  const teom = /teom|taxe\s+d['’]enl[eè]vement\s+des\s+ordures/i.test(text);
  const miseConformite = /(mise\s+en\s+conformit[eé]|accessibilit[eé]|amiante|désamiantage)/i.test(text);
  const regCharges = /(r[eé]gularisation).{0,20}(annuelle|trimestrielle|mensuelle)/i.test(text);

  // ——— Dépôt / pénalités
  const depot = firstMatch(/d[eé]p[oô]t\s+de\s+garantie[^0-9]*(\d+[.,]?\d*)/i, raw);
  const depotMonths = firstMatch(/(\d+)\s*mois\s+de\s+loyer/i, text);
  const penalRate = firstMatch(/(\d+[.,]?\d*)\s*%\s*(?:par\s*(?:an|mois)|l['’]an|annuel|mensuel)/i, text);
  const penalites = /(p[eé]nalit[ée]s?|int[eé]r[eê]ts\s+de\s+retard)/i.test(text);

  // ——— Cession / sous-location / renouvellement
  const cessionRestr = /(cession|sous-?location).*(interdit|soumis|autorisation|agr[eé]ment)/i.test(text);
  const solidariteCedant = /(garantie|obligation).{0,40}solidaire.{0,40}(c[eé]dant)/i.test(text);
  const garantie3ans = /(l\.?\s*145-16-1|garanti.{0,10}3\s*ans)/i.test(text);
  const renouvellementRenonciation = /(renonciation).{0,20}(renouvellement|droit au renouvellement)/i.test(text);
  const indemEviction = /(indemnit[ée]\s+d['’]e?viction)/i.test(text);

  // ——— Destination / exclusivité
  const destination = firstMatch(/(destination|usage)\s*[:\-]\s*([^\n]+)/i, raw);
  const exclusivite = /(exclusivit[eé]|non[-\s]?concurrence)/i.test(text);

  // ——— Résolutoire / préavis
  const resolutoire = /(clause\s+résolutoire|résiliation\s+de\s+plein\s+droit)/i.test(text);
  const preavisLong = /(pr[eé]avis).{0,20}(\d{2}\s*mois|un\s*an)/i.test(text);

  // ——— Franchise de loyer
  const franchise = firstMatch(/franchise[^.\n]*(\d+)\s*mois/i, text) || (/\bloyers?\s+gratuits?\b/i.test(text) ? "oui" : null);

  // ——— Score global
  let riskScore = 0;
  if (indexLabel === "ICC") riskScore += 0.25;
  if (!indexPlaf) riskScore += 0.15;
  if (indexOneWay) riskScore += 0.25;
  if (grossesRep) riskScore += 0.25;
  if (taxeFonc || teom) riskScore += 0.15;
  if (resolutoire) riskScore += 0.1;
  if (solidariteCedant) riskScore += 0.15;
  riskScore = Math.min(1, riskScore);

  const findings: Finding[] = [];

  // ——— Durée
  findings.push({
    id: "duration",
    title: "Durée du bail",
    severity: "info",
    detail: dureeNote,
    advice: "Vérifiez que la durée est cohérente avec votre projet (sorties anticipées, renouvellement).",
    tags: ["durée", "9 ans", "12 ans"]
  });

  // ——— Indexation
  if (indexLabel) {
    findings.push({
      id: "index",
      title: "Indexation du loyer",
      severity: indexLabel === "ICC" ? "warn" : "info",
      detail: `Index repéré : ${indexLabel}${indexPeriod ? ` (${indexPeriod})` : ""}${indexPlaf ? " ; plafonné" : ""}.`,
      advice:
        indexOneWay
          ? "La clause semble à sens unique (hausse seulement) : à corriger (risque de nullité)."
          : indexLabel === "ICC"
          ? "Privilégiez ILC/ILAT. Encadrez la mécanique (périodicité, index de base, plafonnement)."
          : "Vérifiez l’index de référence, la périodicité et un éventuel plafonnement.",
      tags: ["index", "révision", "ILC", "ILAT", "ICC"]
    });
  } else {
    findings.push({
      id: "index-missing",
      title: "Indexation non détectée",
      severity: "warn",
      detail: "Aucune clause d’indexation claire détectée (à vérifier).",
      advice: "Ajoutez une clause d’indexation claire (souvent ILC/ILAT) ou confirmez l’absence d’indexation.",
      tags: ["indexation absente"]
    });
  }

  if (indexOneWay) {
    findings.push({
      id: "index-one-way",
      title: "Indexation à la hausse uniquement",
      severity: "high",
      detail: "La clause semble ne prévoir qu’une hausse (clause « cliquet »).",
      advice: "Rendre la clause bilatérale (hausse ET baisse) pour éviter la nullité.",
      tags: ["indexation", "clause cliquet"]
    });
  }

  // ——— Charges & travaux & taxes
  if (grossesRep || taxeFonc || teom || miseConformite) {
    findings.push({
      id: "charges",
      title: "Charges récupérables",
      severity: grossesRep ? "high" : taxeFonc || teom ? "warn" : "info",
      detail:
        grossesRep
          ? "Mention d’« article 606 » ou « grosses réparations » : semble à la charge du locataire."
          : taxeFonc
          ? "La taxe foncière semble récupérée sur le locataire."
          : teom
          ? "TEOM mentionnée comme refacturée."
          : "Charges mentionnées (détail à vérifier).",
      advice:
        grossesRep
          ? "Listez précisément les charges récupérables, excluez les grosses réparations (art. 606) et encadrez la taxe foncière."
          : "Précisez la liste des charges, modalités de régularisation et justificatifs.",
      where: ["charges", "réparations", "606", "taxe foncière", "TEOM"],
      tags: ["charges", "606", "taxe foncière", "TEOM", "régularisation"]
    });
  }
  if (regCharges) {
    findings.push({
      id: "charges-regularisation",
      title: "Régularisation des charges",
      severity: "info",
      detail: "Régularisation périodique des charges mentionnée.",
      advice: "Exiger une régularisation annuelle, un décompte détaillé et les justificatifs.",
      tags: ["régularisation", "décompte"]
    });
  }
  if (miseConformite) {
    findings.push({
      id: "travaux-conformite",
      title: "Mise en conformité / travaux",
      severity: "warn",
      detail: "Mentions de mise en conformité (accessibilité, amiante, etc.).",
      advice: "Clarifiez la répartition des travaux et des coûts de mise en conformité.",
      tags: ["travaux", "conformité", "amiante", "accessibilité"]
    });
  }

  // ——— Dépôt / pénalités
  if (depot || depotMonths) {
    findings.push({
      id: "deposit",
      title: "Dépôt de garantie",
      severity: "info",
      detail: depot ? `Montant repéré : ${depot} (à confirmer).` : `Mention de ${depotMonths} mois de loyer (à confirmer).`,
      advice: "Vérifiez le montant (souvent 1–3 mois de loyer HT/HC) et les conditions de restitution.",
      where: ["dépôt de garantie"],
      tags: ["dépôt", "garantie", "mois de loyer"]
    });
  }
  if (penalites) {
    findings.push({
      id: "penalties",
      title: "Pénalités de retard / intérêts",
      severity: "warn",
      detail: penalRate ? `Taux repéré : ${penalRate}.` : "Clause de pénalités repérée (taux/conditions à vérifier).",
      advice: "Encadrez le taux (raisonnable), les délais de grâce et les modalités de mise en demeure.",
      where: ["pénalités", "intérêts de retard"],
      tags: ["pénalités", "intérêts", "taux"]
    });
  }

  // ——— Cession / sous-location
  if (cessionRestr) {
    findings.push({
      id: "assignment",
      title: "Cession / sous-location",
      severity: "warn",
      detail: "Des restrictions à la cession/sous-location semblent présentes.",
      advice: "Prévoir une autorisation non abusive, des délais de réponse, et limiter les garanties du cédant.",
      where: ["cession", "sous-location", "autorisation"],
      tags: ["cession", "sous-location", "agrément"]
    });
  }
  if (solidariteCedant) {
    findings.push({
      id: "cession-solidarite",
      title: "Garantie solidaire du cédant",
      severity: "warn",
      detail: "Garantie/solidarité du cédant détectée.",
      advice: "Limiter la solidarité (ex. maximum 3 ans, art. L145-16-1) et la cantonner aux obligations essentielles.",
      tags: ["solidarité", "cédant", "L145-16-1"]
    });
  }
  if (garantie3ans) {
    findings.push({
      id: "garantie-3-ans",
      title: "Garantie du repreneur (3 ans)",
      severity: "info",
      detail: "Référence à la garantie triennale (L145-16-1).",
      advice: "Vérifier le périmètre exact des obligations couvertes et la notification au bailleur.",
      tags: ["garantie 3 ans", "L145-16-1"]
    });
  }

  // ——— Renouvellement / éviction
  if (renouvellementRenonciation) {
    findings.push({
      id: "renouvellement-renonciation",
      title: "Renonciation au renouvellement",
      severity: "high",
      detail: "Mention d’une renonciation au droit au renouvellement.",
      advice: "Point sensible : faites valider par un conseil. Vérifier l’indemnité d’éviction.",
      tags: ["renouvellement", "indemnité d’éviction"]
    });
  }
  if (indemEviction) {
    findings.push({
      id: "indem-eviction",
      title: "Indemnité d’éviction",
      severity: "info",
      detail: "Indemnité d’éviction mentionnée.",
      advice: "Vérifier les cas d’exclusion, la méthode de calcul et les délais.",
      tags: ["éviction"]
    });
  }

  // ——— Destination / exclusivité
  if (destination) {
    findings.push({
      id: "destination",
      title: "Destination des locaux",
      severity: "info",
      detail: `Destination indiquée : ${destination}.`,
      advice: "Vérifier l’adéquation avec l’activité projetée et les règles d’urbanisme.",
      where: ["destination", "usage"],
      tags: ["destination", "usage", "exclusivité"]
    });
  }
  if (exclusivite) {
    findings.push({
      id: "exclusivite",
      title: "Exclusivité / non-concurrence",
      severity: "warn",
      detail: "Clause d’exclusivité ou de non-concurrence détectée.",
      advice: "Encadrer le périmètre, la durée et le secteur géographique.",
      tags: ["exclusivité", "non-concurrence"]
    });
  }

  // ——— Résolutoire / préavis
  if (resolutoire) {
    findings.push({
      id: "resolutory",
      title: "Clause résolutoire",
      severity: "warn",
      detail: "Résiliation de plein droit en cas de manquement.",
      advice: "Encadrer la mise en demeure, le délai de remède et les cas visés.",
      tags: ["résolutoire", "mise en demeure"]
    });
  }
  if (preavisLong) {
    findings.push({
      id: "notice",
      title: "Préavis inhabituel",
      severity: "warn",
      detail: "Préavis long détecté (≥ 6 mois).",
      advice: "Négocier un préavis raisonnable et symétrique.",
      tags: ["préavis"]
    });
  }

  // ——— Franchise de loyer
  if (franchise) {
    findings.push({
      id: "franchise",
      title: "Franchise de loyer",
      severity: "info",
      detail: typeof franchise === "string" && franchise !== "oui" ? `Franchise repérée : ${franchise} mois.` : "Mention d’une franchise/loyers gratuits.",
      advice: "Préciser la durée, l’étalement et l’impact sur l’indexation.",
      tags: ["franchise"]
    });
  }

  const summary = {
    riskScore,
    riskLevel: riskScore >= 0.66 ? "élevé" : riskScore >= 0.33 ? "moyen" : "modéré",
    highlights: [
      indexLabel ? `Indexation: ${indexLabel}${indexPlaf ? " (cap)" : ""}` : "Indexation non détectée",
      indexOneWay ? "Indexation à sens unique" : undefined,
      grossesRep ? "606 potentiellement à la charge du locataire" : undefined,
      taxeFonc ? "Taxe foncière récupérée" : undefined,
      resolutoire ? "Clause résolutoire" : undefined,
      solidariteCedant ? "Solidarité du cédant" : undefined,
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
