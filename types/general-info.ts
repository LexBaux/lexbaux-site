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

const pick = (m?: RegExpMatchArray | null, i = 1) =>
  m && m[i] ? m[i].trim().replace(/\s+/g, " ") : undefined;

export function extractGeneralInfoFromText(text: string): GeneralInfo {
  const t = (text || "").replace(/\u00A0/g, " ");

  const bailleurLine = t.match(/Bailleur\s*:?\s*(.+?)(?:\n|$)/i);
  const preneurLine  = t.match(/Preneur\s*:?\s*(.+?)(?:\n|$)/i);
  const bienLine     = t.match(/Bien\s+loué\s*:?\s*(.+?)(?:\n|$)/i);
  const destinLine   = t.match(/Destination\s+des\s+locaux\s*:?\s*(.+?)(?:\n|$)/i);
  const loyerLine    = t.match(/Loyer\s*:?\s*(.+?)(?:\n|$)/i);
  const pouvoirsLine = t.match(/(représentée?|représenté)\s+par\s+(.+?)(?:\.|\n|$)/i);

  const rcsBailleur  = t.match(/Bailleur[\s\S]*?RCS[^0-9]*([0-9 ]{9,})/i);
  const rcsPreneur   = t.match(/Preneur[\s\S]*?RCS[^0-9]*([0-9 ]{9,})/i);
  const formeBailleur = t.match(/Bailleur[\s\S]*?\b(SARL|SASU?|SCI|EURL|SA|SCA|SNC)\b/i);
  const formePreneur  = t.match(/Preneur[\s\S]*?\b(SARL|SASU?|SCI|EURL|SA|SCA|SNC)\b/i);

  return {
    bailleurNom: pick(bailleurLine),
    bailleurForme: pick(formeBailleur),
    bailleurRCS: pick(rcsBailleur),
    preneurNom: pick(preneurLine),
    preneurForme: pick(formePreneur),
    preneurRCS: pick(rcsPreneur),
    qualitePouvoirsSignataires: pouvoirsLine ? pick(pouvoirsLine, 0) : undefined,
    designationBien: pick(bienLine),
    destinationLocaux: pick(destinLine),
    loyerCommercial: pick(loyerLine),
  };
}

export function extractGeneralInfoFromAnalysis(analysis: any, raw?: string) {
  const txt = raw || analysis?.rawText || analysis?.fullText || analysis?.text || "";
  return extractGeneralInfoFromText(txt);
}
