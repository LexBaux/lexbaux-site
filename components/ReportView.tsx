"use client";

type Finding = {
  id: string;
  title: string;
  severity: "info" | "warn" | "high";
  detail: string;
  where?: string[];   // déjà renvoyé par route.ts
  tags?: string[];    // optionnel (on lira where si absent)
  advice?: string;    // optionnel (on mettra un conseil par défaut)
};

type Report = {
  meta: {
    title?: string;
    pages?: number;
    indexation?: string | null;
    plafonnement?: boolean;
    filename?: string;
  };
  summary?: {
    riskScore?: number;
    riskLevel?: string;      // << plus souple pour éviter un blocage TS
    highlights?: string[];
  };
  findings: Finding[];
};


const severityLabel: Record<Finding["severity"], string> = {
  info: "Information",
  warn: "À surveiller",
  high: "Risque élevé",
};

const severityHelp: Record<Finding["severity"], string> = {
  info: "Point d’attention mineur ou informatif.",
  warn: "Peut nécessiter un ajustement ou une vérification.",
  high: "Risque juridique/financier important : action recommandée.",
};

// Conseils affichés côté UI en fonction du type de finding.
// (Pas besoin de modifier route.ts)
function adviceFor(f: Finding): string {
  switch (f.id) {
    case "duration":
      return "Vérifiez que la durée est cohérente avec votre projet (sorties anticipées, renouvellement).";
    case "index":
      return f.detail.includes("ICC")
        ? "Privilégiez ILC/ILAT. Négociez un plafonnement (cap) et la fréquence de révision."
        : "Confirmez l’indice choisi et les modalités (périodicité, cap).";
    case "index-missing":
      return "Ajoutez une clause d’indexation claire (souvent ILC/ILAT) ou confirmez l’absence d’indexation.";
    case "charges":
      return "Listez précisément les charges récupérables. Excluez les 'grosses réparations' (art. 606) et encadrez la taxe foncière.";
    case "deposit":
      return "Vérifiez le montant (souvent 1–3 mois de loyer HT/HC) et les conditions de restitution.";
    case "penalties":
      return "Encadrez les pénalités (taux, délai de grâce). Vérifiez la proportionnalité.";
    case "assignment":
      return "Prévoyez des conditions raisonnables de cession/sous-location (accord non abusif, critères objectifs).";
    case "destination":
      return "Assurez-vous que l’activité réelle est couverte par la destination pour éviter tout blocage.";
    case "resolutory":
      return "Prévoyez un mécanisme de mise en demeure et un délai de cure avant résiliation automatique.";
    case "notice":
      return "Négociez un préavis raisonnable (ex. 3–6 mois) selon vos besoins opérationnels.";
    case "noncompete":
      return "Limitez la portée (durée, périmètre, produits) pour sécuriser votre développement.";
    default:
      return "Faites valider ce point par votre conseil ou ajustez la clause si nécessaire.";
  }
}

// Petite barre de risque
function RiskBar({ score = 0 }: { score?: number }) {
  const pct = Math.round(Math.min(100, Math.max(0, score * 100)));
  return (
    <div className="mt-2 h-2 w-full rounded bg-slate-200">
      <div className="h-2 rounded bg-orange-600" style={{ width: `${pct}%` }} />
    </div>
  );
}

export default function ReportView({ report }: { report: Report }) {
  const { meta = {}, summary, findings = [] } = report;
  const riskText = summary?.riskLevel ?? (summary?.riskScore ?? 0) >= 0.66
    ? "élevé"
    : (summary?.riskScore ?? 0) >= 0.33
    ? "moyen"
    : "modéré";

  const adviceFor = (f: Finding) => f.advice ?? severityHelp[f.severity];

    return (
    <section className="mt-10">
      {/* Carte méta */}
      <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <h2 className="text-lg font-semibold text-slate-800">Rapport d’analyse</h2>
        <div className="mt-4 grid grid-cols-2 sm:grid-cols-4 gap-4 text-sm">
          <div>
            <div className="text-slate-500">Titre</div>
            <div className="font-medium">{meta.title ?? "—"}</div>
          </div>
          <div>
            <div className="text-slate-500">Pages</div>
            <div className="font-medium">{meta.pages ?? "—"}</div>
          </div>
          <div>
            <div className="text-slate-500">Fichier</div>
            <div className="font-medium">{meta.filename ?? "—"}</div>
          </div>
          <div>
            <div className="text-slate-500">Indexation</div>
            <div className="font-medium">{meta.indexation ?? "—"}</div>
          </div>
          <div>
            <div className="text-slate-500">Plafonnement</div>
            <div className="font-medium">{meta.plafonnement ? "Oui" : "Non"}</div>
          </div>
          <div className="col-span-2">
            <div className="flex items-center justify-between text-slate-500">
              <span>Niveau de risque</span>
              <span className="font-medium text-slate-800">{riskText}</span>
            </div>
            <RiskBar score={summary?.riskScore} />
            {summary?.highlights?.length ? (
              <div className="mt-2 flex flex-wrap gap-2">
                {summary.highlights.map((h, i) => (
                  <span key={i} className="rounded bg-slate-100 px-2 py-0.5 text-xs">
                    {h}
                  </span>
                ))}
              </div>
            ) : null}
          </div>
        </div>
      </div>

      {/* Findings */}
      <div className="mt-8 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <h3 className="text-base font-semibold text-slate-800 mb-4">Conformité & alertes</h3>

        <ul className="space-y-4">
          {findings.map((f) => (
            <li key={f.id} className="rounded-xl border border-slate-200 p-4">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <div className="flex items-center gap-2">
                    <span
                      className={
                        "inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium " +
                        (f.severity === "high"
                          ? "bg-red-100 text-red-700"
                          : f.severity === "warn"
                          ? "bg-yellow-100 text-yellow-700"
                          : "bg-slate-100 text-slate-700")
                      }
                      title={severityHelp[f.severity]}
                    >
                      {severityLabel[f.severity]}
                    </span>
                    <span className="font-medium text-slate-800">{f.title}</span>
                  </div>

                  <p className="mt-2 text-sm text-slate-700">{f.detail}</p>

                  <p className="mt-2 text-sm text-slate-600">
                    <span className="font-medium">Conseil :</span> {adviceFor(f)}
                  </p>

                  {(f.tags ?? f.where)?.length ? (
  <div className="text-xs text-slate-500">
    Mots-clés : {(f.tags ?? f.where)!.join(", ")}
  </div>
) : null}

                </div>
              </div>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
