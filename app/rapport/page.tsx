// app/rapport/page.tsx
"use client";

// 👇 Empêche le prerender statique et évite l'erreur liée à useSearchParams
export const dynamic = "force-dynamic";

import { useMemo } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import GeneralInfoCard from "@/components/GeneralInfoCard";
import { extractGeneralInfoFromAnalysis } from "@/types/general-info";

function RiskBar({ score = 0.71 }: { score?: number }) {
  const pct = Math.min(100, Math.max(0, Math.round((score ?? 0) * 100)));
  return (
    <div className="mt-2 h-2 w-full rounded bg-slate-200">
      <div className="h-2 rounded bg-red-500" style={{ width: `${pct}%` }} />
    </div>
  );
}

// ---------- RAPPORT DEMO (toujours identique) ----------
const DEMO_RAW_TEXT = `
BAIL COMMERCIAL
Bailleur : Société IMMOBAIL SARL immatriculée au RCS de Lyon sous le n° 512 345 678, siège social 12 rue de la République, 69001 Lyon, représentée par son gérant M. Jean Dupont.
Preneur : Société RESTAURA SAS immatriculée au RCS de Lyon sous le n° 789 654 321, siège social 45 av. des Frères Lumière, 69008 Lyon, représentée par sa Présidente Mme Claire Martin.
Bien loué : Local commercial 15 rue Victor Hugo, 69002 Lyon (120 m²).
Destination des locaux : Activité de restauration rapide (hors cuisson avec extraction).
Loyer : 2 400 € HT par mois, payable trimestriellement d’avance.
Dépôt de garantie : 7 200 € (3 mois de loyer HT).
Durée du bail : 9 ans.
Indexation : ILC annuel.
Clause résolutoire : Défaut de paiement/obligations contractuelles.
`.trim();

const DEMO_REPORT_BASE = {
  meta: {
    title: "BAIL COMMERCIAL",
    pages: 27,
    indexation: "ILC",
    plafonnement: true,
    filename: "bail.pdf",
  },
  summary: {
    riskScore: 0.71,
    riskLevel: "élevé",
    highlights: [
      "Indexation: ILC (cap)",
      "606€ potentiellement à la charge du locataire",
      "Taxe foncière récupérée",
      "Clause résolutoire",
      "Solidarité du cédant",
    ],
  },
  rawText: DEMO_RAW_TEXT,
  findings: [
    {
      id: "charges",
      title: "Charges récupérables",
      severity: "high",
      detail:
        "Mention d’« article 606 » ou « grosses réparations » : semble à la charge du locataire.",
      advice:
        "Lister précisément les charges récupérables, exclure les grosses réparations (art. 606) et encadrer la taxe foncière.",
      tags: ["charges", "606", "taxe foncière", "régularisation"],
    },
    {
      id: "mise_conformite",
      title: "Mise en conformité / travaux",
      severity: "warn",
      detail: "Mentions de mise en conformité (accessibilité, amiante, etc.).",
      advice:
        "Clarifier la répartition des travaux et des coûts de mise en conformité.",
      tags: ["travaux", "conformité", "amiante", "accessibilité"],
    },
    {
      id: "deposit",
      title: "Dépôt de garantie",
      severity: "info",
      detail: "Montant repéré : 3 (à confirmer).",
      advice:
        "Vérifier le montant (souvent 1–3 mois de loyer HT/HC) et les conditions de restitution.",
      tags: ["dépôt", "garantie"],
    },
    {
      id: "cession",
      title: "Cession / sous-location",
      severity: "warn",
      detail:
        "Des restrictions à la cession/sous-location semblent présentes.",
      advice:
        "Prévoir une autorisation non abusive, des délais de réponse, et limiter les garanties du cédant.",
      tags: ["cession", "sous-location", "agrément"],
    },
    {
      id: "exclusivite",
      title: "Exclusivité / non-concurrence",
      severity: "warn",
      detail: "Clause d’exclusivité ou de non-concurrence détectée.",
      advice:
        "Encadrer le périmètre, la durée et le secteur géographique.",
      tags: ["exclusivité", "non-concurrence"],
    },
    {
      id: "resolutoire",
      title: "Clause résolutoire",
      severity: "warn",
      detail:
        "Résiliation de plein droit en cas d’impayé ou de manquement.",
      advice:
        "Prévoir mise en demeure préalable, délai de remède et cas précisément listés.",
      tags: ["résiliation", "mise en demeure"],
    },
  ],
};

const severityLabel: Record<string, string> = {
  info: "Information",
  warn: "À surveiller",
  high: "Risque élevé",
};

export default function RapportPage() {
  const search = useSearchParams();
  const router = useRouter();
  const filename = search.get("file") || "bail.pdf";

  const report = useMemo(
    () => ({ ...DEMO_REPORT_BASE, meta: { ...DEMO_REPORT_BASE.meta, filename } }),
    [filename]
  );

  const info = useMemo(
    () => extractGeneralInfoFromAnalysis(report),
    [report]
  );

  return (
    <div className="mx-auto max-w-5xl px-4 py-10">
      {/* Header */}
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900">Rapport d’analyse</h1>
          <p className="text-slate-500 text-sm">Généré par LexBaux</p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => window.print()}
            className="rounded-md border border-slate-300 px-3 py-2 text-sm hover:bg-slate-50"
          >
            Exporter en PDF
          </button>
          <button
            onClick={() => router.push("/")}
            className="rounded-md bg-slate-900 px-3 py-2 text-sm text-white hover:bg-slate-800"
          >
            Nouveau bail
          </button>
        </div>
      </div>

      {/* Synthèse */}
      <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm print:border-0 print:shadow-none">
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
            {report.summary.highlights?.length ? (
              <div className="mt-3 flex flex-wrap gap-2">
                {report.summary.highlights.map((h, i) => (
                  <span key={i} className="rounded bg-slate-100 px-2 py-0.5 text-xs text-slate-700">{h}</span>
                ))}
              </div>
            ) : null}
          </div>
        </div>
      </section>

      {/* Informations générales */}
      <GeneralInfoCard info={info} />

      {/* Conformité & alertes */}
      <section className="mt-8 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm print:border-0 print:shadow-none">
        <h3 className="mb-4 text-base font-semibold text-slate-800">Conformité & alertes</h3>
        <ul className="space-y-4">
          {report.findings.map((f: any) => (
            <li key={f.id} className="rounded-xl border border-slate-200 bg-white p-4">
              <div className="flex items-center gap-2">
                <span className={
                  "inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium " +
                  (f.severity === "high"
                    ? "bg-red-100 text-red-700"
                    : f.severity === "warn"
                    ? "bg-yellow-100 text-yellow-700"
                    : "bg-slate-100 text-slate-700")
                }>
                  {severityLabel[f.severity]}
                </span>
                <h4 className="text-sm font-semibold text-slate-800">{f.title}</h4>
              </div>
              <p className="mt-2 text-sm text-slate-700">{f.detail}</p>
              {f.advice && <p className="mt-1 text-sm text-slate-500"><span className="font-medium">Conseil :</span> {f.advice}</p>}
              {f.tags?.length ? (
                <div className="mt-2 flex flex-wrap gap-1">
                  {f.tags.map((t: string) => (
                    <span key={t} className="rounded bg-slate-100 px-2 py-0.5 text-[11px] text-slate-600">{t}</span>
                  ))}
                </div>
              ) : null}
            </li>
          ))}
        </ul>
      </section>

      {/* Check-list */}
      <section className="mt-8 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm print:border-0 print:shadow-none">
        <h3 className="mb-4 text-base font-semibold text-slate-800">Check-list de négociation</h3>
        <ol className="list-decimal pl-5 text-sm text-slate-700 space-y-2">
          <li>Confirmer l’indexation (ILC/ILAT) et son plafonnement éventuel.</li>
          <li>Limiter les charges récupérables (exclure art. 606) et encadrer la taxe foncière.</li>
          <li>Clarifier la répartition des travaux (mise en conformité, gros entretien).</li>
          <li>Encadrer la clause résolutoire (mise en demeure, délai de remède).</li>
          <li>Négocier les garanties (dépôt, caution) et leur durée.</li>
          <li>Vérifier les restrictions de cession/sous-location.</li>
        </ol>
      </section>
    </div>
  );
}
