// app/rapport/page.tsx
"use client";

export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";

import React, { useMemo } from "react";
import { useSearchParams, useRouter } from "next/navigation";

/* ---------- UI helpers ---------- */
function RiskBar({ score = 0.7 }: { score?: number }) {
  const pct = Math.min(100, Math.max(0, Math.round((score ?? 0) * 100)));
  return (
    <div className="mt-2 h-2 w-full rounded bg-slate-200">
      <div className="h-2 rounded bg-orange-600" style={{ width: `${pct}%` }} />
    </div>
  );
}
const chip = (txt: string, tone: "high" | "warn" | "info" = "info") => {
  const map = {
    high: "bg-red-100 text-red-700",
    warn: "bg-yellow-100 text-yellow-800",
    info: "bg-slate-100 text-slate-700",
  } as const;
  return <span className={`px-2 py-0.5 text-xs rounded ${map[tone]}`}>{txt}</span>;
};
const badge = (txt: string) => (
  <span className="rounded bg-slate-100 text-slate-700 px-2 py-0.5 text-xs">{txt}</span>
);
const severityLabel: Record<string, string> = {
  high: "Risque élevé",
  warn: "À surveiller",
  info: "Information",
};

/* ---------- Données DEMO (100% fixes) ---------- */
const DEMO_REPORT_BASE: any = {
  meta: {
    title: "BAIL COMMERCIAL",
    pages: 27,
    indexation: "ILC",
    plafonnement: true,
    filename: "bail_test (1).pdf",
    version: "demo-premium-xl",
  },
  // >>> Ces informations s’affichent telles quelles, quoi qu’il arrive
  generalInfo: {
    bailleur: {
      nom: " SOCIETE IMMOBAIL SARL ",
      forme: "SARL",
      siren: "512 345 678",
      siege: "12 rue de la République, 69001 Lyon",
      representant: "M. Jean Dupont ; Gérant",
    },
    preneur: {
      nom: " RESTAURA ",
      forme: "SAS",
      siren: "789 654 321",
      siege: "45 av. des Frères Lumière, 69008 Lyon",
      representant: "Mme Claire Martin ; Présidente",
    },
    bien: {
      adresse: "15 rue Victor Hugo, 69002 Lyon",
      surface: "≈120 m²",
      destination: "Restauration rapide (hors cuisson avec extraction)",
      loyer: "2 400 € HT/HC / mois (trimestriel d’avance)",
      depot: "7 200 € (3 mois HT/HC)",
      duree: "9 ans (faculté triennale)",
      indexation: "ILC annuel",
    },
  },
  summary: {
    riskScore: 0.72,
    riskLevel: "élevé",
    highlights: [
      "Charges : exclusion 606 non garantie",
      "Taxe foncière / TEOM récupérables",
      "Solidarité du cédant potentiellement illimitée",
      "Clause résolutoire large",
      "Indexation ILC : cap à préciser",
    ],
  },
  impacts: [
    { label: "Indexation annuelle (ILC)", estimation: "+3–5% / an", note: "Cap recommandé (ex. +5%/an)" },
    { label: "Charges récupérables", estimation: "≈ +8–12% du loyer", note: "Inclut TF/TEOM si non exclus" },
    { label: "Dépôt de garantie", estimation: " 3 mois HT/HC", note: "À confirmer dans l’acte" },
    { label: "Pénalités de retard", estimation: "≈ 12% / an", note: "Encadrement / délai de grâce à prévoir" },
    { label: "Travaux de conformité", estimation: "variable", note: "Plafonds à fixer côté preneur" },
  ],
  findings: [
    // HIGH
    {
      id: "charges_606",
      title: "Charges – grosses réparations (art. 606) / structure",
      severity: "high",
      detail:
        "Le bail ne semble pas exclure les grosses réparations (art. 606 C. civ.) ni les travaux structurels (ravalement, étanchéité, gros œuvre).",
      advice:
        "Insérer une clause d’exclusion expresse des grosses réparations et des travaux structurels ; limiter la refacturation à l’entretien courant/menues réparations.",
      tags: ["charges", "606", "gros œuvre", "ravalement"],
    },
    {
      id: "tf_teom",
      title: "Taxe foncière / TEOM récupérables",
      severity: "high",
      detail: "La taxe foncière et la TEOM paraissent intégralement récupérables sans plafond.",
      advice:
        "Exclure la TEOM ; plafonner la taxe foncière (forfait/Cap) avec justificatifs annuels et mécanisme de régularisation encadré.",
      tags: ["taxe foncière", "TEOM", "régularisation"],
    },
    // WARN
    {
      id: "cession_solidarite",
      title: "Cession / Sous-location – solidarité du cédant",
      severity: "warn",
      detail:
        "Agrément du bailleur requis ; solidarité du cédant vraisemblablement illimitée dans le temps.",
      advice:
        "Limiter la solidarité du cédant à 3 ans maximum ; critères d’agrément objectifs (solvabilité, expérience) ; délai de réponse 15 jours.",
      tags: ["cession", "agrément", "solidarité du cédant"],
    },
    {
      id: "resolutoire",
      title: "Clause résolutoire – déclenchement et délais",
      severity: "warn",
      detail:
        "Résiliation de plein droit en cas d’impayés/manquements sans mécanisme précis de mise en demeure et délai de remède.",
      advice:
        "Mise en demeure RAR préalable ; délai de remède 30 jours ; liste limitative des cas de résolution ; exclusion des manquements mineurs.",
      tags: ["résiliation", "mise en demeure", "délai de remède"],
    },
    {
      id: "travaux_conformite",
      title: "Travaux / Mise en conformité",
      severity: "warn",
      detail:
        "Répartition des mises en conformité légales (accessibilité, amiante, sécurité) et plafonds côté preneur non précisés.",
      advice:
        "Les obligations légales incombent au bailleur ; travaux privatifs du preneur plafonnés (X € HT/an) ; procédure d’autorisation et délais.",
      tags: ["travaux", "conformité", "plafonds"],
    },
    // INFO
    {
      id: "indexation",
      title: "Indexation du loyer",
      severity: "info",
      detail: "Indexation ILC/ILAT repérée ; cap/plancher non déterminés.",
      advice:
        "Fixer l’index (ILC/ILAT), la date anniversaire, un cap annuel (ex. +5 %) et un plancher 0 % ; exclure toute rétroactivité.",
      tags: ["ILC", "ILAT", "cap"],
    },
    {
      id: "deposit",
      title: "Dépôt de garantie",
      severity: "info",
      detail: "Montant indicatif 3 mois HT/HC (à confirmer).",
      advice: "Confirmer le montant, la restitution et d’éventuels intérêts si durée longue.",
      tags: ["dépôt", "garantie"],
    },
    {
      id: "diagnostics_annexes",
      title: "Diagnostics & annexes",
      severity: "info",
      detail:
        "ERP, amiante, électricité/gaz, règlement de copropriété susceptibles d’être requis.",
      advice:
        "Vérifier la remise signée des diagnostics ; demander règlement de copropriété/EDD le cas échéant.",
      tags: ["ERP", "amiante", "copropriété"],
    },
  ],
  checklist: {
    priorites: [
      "Exclure expressément l’art. 606 et les travaux structurels.",
      "Négocier l’exclusion de la TEOM et plafonner la TF.",
      "Limiter la solidarité du cédant à 3 ans maximum.",
      "Encadrer la clause résolutoire : mise en demeure RAR, délai 30 jours, liste limitative.",
      "Fixer l’index (ILC/ILAT) avec cap annuel et date anniversaire.",
      "Clarifier les mises en conformité et plafonner les travaux preneur.",
      "Exiger les diagnostics/annexes et leur remise signée.",
      "Définir précisément la destination et interdire ICPE/ERP sans accord.",
      "Préciser les obligations d’assurance et les preuves annuelles.",
      "Vérifier dépôt de garantie (montant, restitution, intérêts).",
      "Encadrer pénalités de retard et délais de grâce.",
      "Prévoir procédure d’autorisation de travaux preneur (délais, plans).",
    ],
    formulations: [
      "Charges — « Sont exclues les grosses réparations de l’art. 606 C. civ. et les travaux structurels (ravalement, étanchéité, gros œuvre). »",
      "Fiscalité — « La TEOM n’est pas récupérable ; la taxe foncière est plafonnée/forfaitisée avec justificatifs annuels. »",
      "Cession — « Solidarité du cédant limitée à trois (3) ans ; critères d’agrément objectifs ; délai de réponse 15 jours. »",
      "Résolutoire — « Activation après mise en demeure RAR, délai de remède 30 jours, pour les seuls cas listés ci-après. »",
      "Index — « Index de base ILC T-4 [année] ; révision annuelle à date anniversaire ; cap de +[X]%/an ; pas de rétroactivité. »",
      "Travaux — « Les mises en conformité légales incombent au bailleur ; les travaux privatifs du preneur sont plafonnés à [X] € HT/an. »",
      "Assurances — « Remise annuelle des attestations ; défaut d’assurance régularisable sous 15 jours avant sanction. »",
      "Destination — « Activités autorisées : … ; ICPE/ERP interdit sauf accord écrit préalable du bailleur. »",
    ],
  },
};

/* ---------- Composant “Informations générales” (statique) ---------- */
function GeneralInfoStatic({ gi }: { gi: any }) {
  const Row = ({ label, value }: { label: string; value?: string }) => (
    <div className="grid grid-cols-2 gap-4 py-2 text-sm sm:grid-cols-3">
      <div className="text-slate-500">{label}</div>
      <div className="col-span-1 sm:col-span-2 text-slate-800">{value ?? "—"}</div>
    </div>
  );
  return (
    <section className="mt-8 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
      <h3 className="text-base font-semibold text-slate-800 mb-4">Informations générales</h3>

      {/* BAILLEUR */}
      <div className="rounded-xl border border-slate-200 p-4 mb-4">
        <div className="mb-2 text-sm font-semibold text-slate-700">Bailleur</div>
        <Row label="Nom" value={gi.bailleur?.nom} />
        <Row label="Forme" value={gi.bailleur?.forme} />
        <Row label="RCS / SIREN" value={gi.bailleur?.siren} />
        <Row label="Siège" value={gi.bailleur?.siege} />
        <Row label="Représentant" value={gi.bailleur?.representant} />
      </div>

      {/* PRENEUR */}
      <div className="rounded-xl border border-slate-200 p-4 mb-4">
        <div className="mb-2 text-sm font-semibold text-slate-700">Preneur</div>
        <Row label="Nom" value={gi.preneur?.nom} />
        <Row label="Forme" value={gi.preneur?.forme} />
        <Row label="RCS / SIREN" value={gi.preneur?.siren} />
        <Row label="Siège" value={gi.preneur?.siege} />
        <Row label="Représentant" value={gi.preneur?.representant} />
      </div>

      {/* BIEN LOUÉ */}
      <div className="rounded-xl border border-slate-200 p-4">
        <div className="mb-2 text-sm font-semibold text-slate-700">Bien loué</div>
        <Row label="Adresse" value={gi.bien?.adresse} />
        <Row label="Surface" value={gi.bien?.surface} />
        <Row label="Destination" value={gi.bien?.destination} />
        <Row label="Loyer" value={gi.bien?.loyer} />
        <Row label="Dépôt de garantie" value={gi.bien?.depot} />
        <Row label="Durée" value={gi.bien?.duree} />
        <Row label="Indexation" value={gi.bien?.indexation} />
      </div>
    </section>
  );
}

/* ---------- Page ---------- */
export default function RapportPage() {
  const search = useSearchParams();
  const router = useRouter();
  const filename = search.get("file") || "bail.pdf";

  const report = useMemo(
    () => ({ ...DEMO_REPORT_BASE, meta: { ...DEMO_REPORT_BASE.meta, filename } }),
    [filename]
  );

  // Tri des findings : high -> warn -> info
  const sortedFindings = useMemo(() => {
    const order: Record<string, number> = { high: 0, warn: 1, info: 2 };
    return [...report.findings].sort(
      (a: any, b: any) => (order[a.severity] ?? 99) - (order[b.severity] ?? 99)
    );
  }, [report]);

  return (
    <div className="bg-gradient-to-b from-orange-50/60 to-white">
      <div className="container mx-auto max-w-[1120px] px-5 py-8">
        {/* Header */}
        <div className="mb-6 flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-extrabold tracking-tight">
              Rapport d’analyse <span className="text-orange-600">LexBaux</span>
            </h1>
            <p className="text-slate-500 text-sm">Synthèse prête à l’emploi (export PDF possible).</p>
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => window.print()}
              className="rounded-[12px] border border-slate-300 px-3 py-2 text-sm hover:bg-slate-50"
            >
              Exporter en PDF
            </button>
            <button
              onClick={() => router.push("/")}
              className="rounded-[12px] bg-slate-900 px-3 py-2 text-sm text-white hover:bg-slate-800"
            >
              Nouveau bail
            </button>
          </div>
        </div>

        {/* Synthèse */}
        <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <h2 className="text-base font-semibold text-slate-800">Synthèse</h2>
          <div className="mt-4 grid grid-cols-2 gap-6 text-sm sm:grid-cols-4">
            <div><div className="text-slate-500">Titre</div><div className="font-medium">{report.meta.title}</div></div>
            <div><div className="text-slate-500">Pages</div><div className="font-medium">{report.meta.pages}</div></div>
            <div><div className="text-slate-500">Fichier</div><div className="font-medium">{report.meta.filename}</div></div>
            <div><div className="text-slate-500">Indexation</div><div className="font-medium">{report.meta.indexation ?? "—"}</div></div>
          </div>

          <div className="mt-6 grid grid-cols-1 items-center gap-4 sm:grid-cols-3">
            <div className="text-sm text-slate-500">Niveau de risque</div>
            <div className="col-span-2">
              <div className="text-sm font-medium text-slate-800">{report.summary.riskLevel}</div>
              <RiskBar score={report.summary.riskScore} />
              {!!report.summary.highlights?.length && (
                <div className="mt-3 flex flex-wrap gap-2">
                  {report.summary.highlights.map((h: string, i: number) => (
                    <span key={i}>{badge(h)}</span>
                  ))}
                </div>
              )}
            </div>
          </div>
        </section>

        {/* Informations générales – 100% fixes */}
        <GeneralInfoStatic gi={report.generalInfo} />

        {/* Impacts financiers */}
        <section className="mt-8 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <h3 className="mb-4 text-base font-semibold text-slate-800">Impacts financiers estimatifs</h3>
          <div className="overflow-hidden rounded-xl border border-slate-200">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 text-slate-600">
                <tr>
                  <th className="text-left p-3">Poste</th>
                  <th className="text-left p-3">Ordre de grandeur</th>
                  <th className="text-left p-3">Note</th>
                </tr>
              </thead>
              <tbody>
                {report.impacts.map((r: any, i: number) => (
                  <tr key={i} className="border-t border-slate-200">
                    <td className="p-3">{r.label}</td>
                    <td className="p-3 font-medium">{r.estimation}</td>
                    <td className="p-3 text-slate-600">{r.note}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="mt-2 text-xs text-slate-500">Estimations indicatives à confirmer au cas par cas.</p>
        </section>

        {/* Conformité & alertes (trié par sévérité) */}
        <section className="mt-8 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <h3 className="mb-4 text-base font-semibold text-slate-800">Conformité & alertes</h3>
          <ul className="space-y-4">
            {sortedFindings.map((f: any) => (
              <li key={f.id} className="rounded-xl border border-slate-200 p-4">
                <div className="flex items-center gap-2">
                  {chip(severityLabel[f.severity], f.severity)}
                  <h4 className="text-sm font-semibold text-slate-800">{f.title}</h4>
                </div>
                <p className="mt-2 text-sm text-slate-700">{f.detail}</p>
                {f.advice && (
                  <p className="mt-1 text-sm text-slate-500">
                    <span className="font-medium">Conseil :</span> {f.advice}
                  </p>
                )}
                {!!f.tags?.length && (
                  <div className="mt-2 flex flex-wrap gap-1">
                    {f.tags.map((t: string) => (
                      <span key={t} className="rounded bg-slate-100 px-2 py-0.5 text-[11px] text-slate-600">{t}</span>
                    ))}
                  </div>
                )}
              </li>
            ))}
          </ul>
        </section>

        {/* Check-list de négociation (nouvelle présentation) */}
        <section className="mt-8 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <h3 className="mb-2 text-base font-semibold text-slate-800">Check-list de négociation</h3>

          <div className="grid gap-6 md:grid-cols-2">
            {/* Colonne 1 : Priorités (cartes numérotées) */}
            <div className="space-y-3">
              <div className="text-sm font-medium text-slate-700 mb-1">Priorités (ordre conseillé)</div>
              {report.checklist.priorites.map((p: string, i: number) => (
                <div key={i} className="flex items-start gap-3 rounded-xl border border-slate-200 p-3">
                  <div className="mt-0.5 inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-full border border-slate-300 text-[12px] font-semibold text-slate-700">
                    {i + 1}
                  </div>
                  <div className="text-sm text-slate-800">{p}</div>
                </div>
              ))}
            </div>

            {/* Colonne 2 : Formulations (cartes sobres) */}
            <div className="space-y-3">
              <div className="text-sm font-medium text-slate-700 mb-1">Formulations à proposer</div>
              {report.checklist.formulations.map((f: string, i: number) => (
                <div key={i} className="rounded-xl border border-slate-200 p-3 text-sm text-slate-800 leading-6">
                  {f}
                </div>
              ))}
            </div>
          </div>
        </section>

        <div className="h-6" />
      </div>
    </div>
  );
}
