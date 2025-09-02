// types/general-info.ts
export type GeneralInfo = {
  bailleurNom?: string;
  bailleurForme?: string;     // SARL, SAS, SCI…
  bailleurRCS?: string;
  preneurNom?: string;
  preneurForme?: string;
  preneurRCS?: string;
  qualitePouvoirsSignataires?: string;
  designationBien?: string;    // adresse + nature
  destinationLocaux?: string;
  loyerCommercial?: string;    // ex: "1 800 € HT / mois"
};

export function extractGeneralInfoFromAnalysis(analysis: any): GeneralInfo {
  return {
    bailleurNom: analysis?.parties?.bailleur?.nom,
    bailleurForme: analysis?.parties?.bailleur?.forme,
    bailleurRCS: analysis?.parties?.bailleur?.rcs,
    preneurNom: analysis?.parties?.preneur?.nom,
    preneurForme: analysis?.parties?.preneur?.forme,
    preneurRCS: analysis?.parties?.preneur?.rcs,
    qualitePouvoirsSignataires: analysis?.signataires?.pouvoirs,
    designationBien: analysis?.bien?.designation,
    destinationLocaux: analysis?.bien?.destination,
    loyerCommercial: analysis?.loyer?.montant,
  };
}
