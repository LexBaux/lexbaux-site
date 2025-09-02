// types/general-info.ts
export type GeneralInfo = {
  bailleurNom?: string;
  bailleurForme?: string;
  bailleurRCS?: string;
  preneurNom?: string;
  preneurForme?: string;
  preneurRCS?: string;
  qualitePouvoirsSignataires?: string;
  designationBien?: string;
  destinationLocaux?: string;
  loyerCommercial?: string;
};

// Normalisation agressive : on enlève les retours à la ligne et on compacte les espaces
function normalize(text: string) {
  return (text || "")
    .replace(/\u00A0/g, " ")        // espaces insécables
    .replace(/\s+/g, " ")           // tout espacement -> un espace
    .trim();
}

// Extrait le segment entre un label et le label suivant
function extractBetween(text: string, label: string, nextLabels: string[]): string | undefined {
  const lbl = label.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const next = nextLabels.map(l => l.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")).join("|");
  const re = new RegExp(`${lbl}\\s*:?\\s*(.*?)(?:(?:${next})\\s*:|$)`, "i");
  const m = text.match(re);
  return m && m[1] ? m[1].trim() : undefined;
}

// Cherche RCS/SIREN dans un segment (ou fallback global)
function extractRCS(segment?: string, fallbackText?: string): string | undefined {
  const source = (segment || "") + " " + (fallbackText || "");
  const m = source.match(/\b(?:RCS|SIREN|SIRET)\b[^0-9]*([0-9][0-9 ]{8,})/i);
  return m && m[1] ? m[1].replace(/\s+/g, " ").trim() : undefined;
}

// Cherche forme sociale la plus courante
function extractForme(segment?: string, fallbackText?: string): string | undefined {
  const source = (segment || "") + " " + (fallbackText || "");
  const m = source.match(/\b(SASU|SAS|SARL|EURL|SCI|SA|SNC|SCA)\b/i);
  return m && m[1] ? m[1].toUpperCase() : undefined;
}

export function extractGeneralInfoFromText(raw: string) : GeneralInfo {
  const t = normalize(raw);

  // Ordre des labels tel qu’on les trouve souvent
  const labels = [
    "Bailleur",
    "Preneur",
    "Bien loué",
    "Destination des locaux",
    "Loyer",
    "Dépôt de garantie",
    "Durée du bail",
    "Indexation",
    "Clause résolutoire"
  ];

  // Segments
  const segBailleur = extractBetween(t, "Bailleur", labels.filter(l => l !== "Bailleur"));
  const segPreneur  = extractBetween(t, "Preneur",  labels.filter(l => l !== "Preneur"));
  const segBien     = extractBetween(t, "Bien loué", labels.filter(l => l !== "Bien loué"));
  const segDest     = extractBetween(t, "Destination des locaux", labels.filter(l => l !== "Destination des locaux"));
  const segLoyer    = extractBetween(t, "Loyer", labels.filter(l => l !== "Loyer"));

  // Nom = segment complet épuré (sans RCS) si présent
  const cleanName = (s?: string) => s
    ? s.replace(/\b(?:RCS|SIREN|SIRET)\b[^0-9]*[0-9][0-9 ]{8,}/i, "").trim()
    : undefined;

  const bailleurNom = cleanName(segBailleur);
  const preneurNom  = cleanName(segPreneur);

  return {
    bailleurNom,
    bailleurForme: extractForme(segBailleur, t),
    bailleurRCS: extractRCS(segBailleur, t),
    preneurNom,
    preneurForme: extractForme(segPreneur, t),
    preneurRCS: extractRCS(segPreneur, t),
    qualitePouvoirsSignataires: (segBailleur || segPreneur || "").match(/représenté(?:e)? par[^.]+/i)?.[0],
    designationBien: segBien,
    destinationLocaux: segDest,
    loyerCommercial: segLoyer
  };
}

// Compat : on regarde d’abord analysis.rawText si présent
export function extractGeneralInfoFromAnalysis(analysis: any, raw?: string) {
  const txt = raw || analysis?.rawText || analysis?.fullText || analysis?.text || "";
  return extractGeneralInfoFromText(txt);
}
