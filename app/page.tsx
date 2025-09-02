"use client";

import React, { useRef, useState } from "react";

import ReportView from "@/components/ReportView";

import Link from "next/link";

import GeneralInfoCard from "../components/GeneralInfoCard";
import { GeneralInfo, extractGeneralInfoFromAnalysis } from "../types/general-info";

// @ts-ignore
import * as pdfjsLib from "pdfjs-dist/build/pdf";
// @ts-ignore
import pdfjsWorker from "pdfjs-dist/build/pdf.worker?url";
pdfjsLib.GlobalWorkerOptions.workerSrc = pdfjsWorker;

async function getPdfText(file: File): Promise<string> {
  const ab = await file.arrayBuffer();
  const pdf = await pdfjsLib.getDocument({ data: ab }).promise;
  let text = "";
  for (let i = 1; i <= pdf.numPages; i++) {
    const page = await pdf.getPage(i);
    const content = await page.getTextContent();
    text += content.items.map((it: any) => it.str).join(" ") + "\n";
  }
  return text;
}


// --- Rapport d'exemple très détaillé (même forme que /api/analyze) ---
const EXAMPLE_REPORT = {
  meta: {
    title: "BAIL COMMERCIAL (exemple)",
    pages: 12,
    indexation: "ILC",
    plafonnement: true,
    filename: "exemple_bail.pdf",
  },
  summary: {
    riskScore: 0.68,
    riskLevel: "élevé",
    highlights: [
      "Indexation: ILC (cap)",
      "606 potentiellement à la charge du locataire",
      "Taxe foncière récupérée",
      "Clause résolutoire",
      "Solidarité du cédant",
    ],
  },
  findings: [
    {
      id: "duration",
      title: "Durée du bail",
      severity: "info",
      detail: "Durée 9 ans détectée (classique).",
      advice: "Vérifiez la cohérence avec votre projet (ouvertures/fermetures, sorties anticipées, renouvellement).",
      tags: ["durée", "9 ans"]
    },
    {
      id: "index",
      title: "Indexation du loyer",
      severity: "info",
      detail: "Index repéré : ILC (annuelle) ; plafonné.",
      advice: "Confirmez l’index de base, la période anniversaire et le mécanisme de plafonnement.",
      tags: ["index", "révision", "ILC", "plafonnement"]
    },
    {
      id: "charges",
      title: "Charges récupérables",
      severity: "high",
      detail: "Mention d’« article 606 » ou « grosses réparations » : semble à la charge du locataire.",
      advice: "Listez précisément les charges récupérables. Excluez les grosses réparations (art. 606) et encadrez la taxe foncière.",
      tags: ["charges", "606", "taxe foncière", "TEOM", "régularisation"]
    },
    {
      id: "penalties",
      title: "Pénalités de retard / intérêts",
      severity: "warn",
      detail: "Taux repéré : 12 % annuel.",
      advice: "Encadrez le taux (raisonnable), la mise en demeure, le délai de grâce et la régularisation.",
      tags: ["pénalités", "intérêts", "taux"]
    },
    {
      id: "assignment",
      title: "Cession / sous-location",
      severity: "warn",
      detail: "Restrictions à la cession/sous-location détectées (agrément préalable).",
      advice: "Précisez des délais de réponse, des critères objectifs et limitez la solidarité du cédant (max 3 ans).",
      tags: ["cession", "sous-location", "agrément", "solidarité"]
    },
    {
      id: "resolutory",
      title: "Clause résolutoire",
      severity: "warn",
      detail: "Résiliation de plein droit en cas de manquement.",
      advice: "Encadrez la mise en demeure (forme, délai de remède) et les cas visés.",
      tags: ["résolutoire", "mise en demeure"]
    },
    {
      id: "deposit",
      title: "Dépôt de garantie",
      severity: "info",
      detail: "Montant repéré : 3 (à confirmer).",
      advice: "Vérifiez le montant (souvent 1–3 mois de loyer HT/HC) et les conditions de restitution.",
      tags: ["dépôt", "garantie"]
    }
  ]
};

export default function Page() {
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  // États nécessaires pour brancher l’API (n’altèrent pas le visuel)
  const [file, setFile] = useState<File | null>(null);
  const [fileName, setFileName] = useState<string>("");
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [report, setReport] = useState<any | null>(null);

const onPickFile = () => fileInputRef.current?.click();

const [generalInfo, setGeneralInfo] = useState<GeneralInfo>({});

const onFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
  const f = e.target.files?.[0] || null;
  setFile(f);
  setFileName(f ? f.name : "");
  setReport(null);
  setErrorMsg(null);
};

const showExample = () => {
  setReport(EXAMPLE_REPORT);
  setFileName("exemple_bail.pdf");
  setFile(null);
  setTimeout(() => {
    document
      .getElementById("report-view")
      ?.scrollIntoView({ behavior: "smooth", block: "start" });
  }, 0);
};

  async function onAnalyze() {
    try {
      setErrorMsg(null);
      setReport(null);
      if (!file) {
        setErrorMsg("Aucun fichier sélectionné.");
        return;
      }

      const formData = new FormData();
      formData.append("file", file); // clé attendue par /api/analyze

      setLoading(true);
      const res = await fetch("/api/analyze", { method: "POST", body: formData });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data?.error || `Erreur serveur (${res.status})`);

const rawText = await getPdfText(file);
console.log("RAW TEXT >>>", rawText.slice(0, 400));
               // extrait le texte du PDF
const dataWithText = { ...data, rawText };            // fusionne avec l’analyse

setReport(dataWithText);                              // met à jour le rapport complet
setGeneralInfo(extractGeneralInfoFromAnalysis(dataWithText));  // extrait infos générales

    } catch (err: any) {
      setErrorMsg(err?.message || "Erreur inconnue");
    } finally {
      setLoading(false);
    }
  }

  function onCancel() {
    setFile(null);
    setFileName("");
    setReport(null);
    setErrorMsg(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  }

  return (
    <main className="text-slate-900">
      {/* HEADER */}
      <header className="sticky top-0 z-20 bg-white/80 backdrop-blur border-b border-slate-200">
        <div className="container mx-auto max-w-[1120px] px-5 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2 font-extrabold tracking-tight">
            <img
              alt="LexBaux"
              className="h-7 w-7 rounded-full"
              src={`data:image/svg+xml;utf8,${encodeURIComponent(
                `<?xml version="1.0"?><svg xmlns='http://www.w3.org/2000/svg' width='28' height='28' viewBox='0 0 100 100'><circle cx='50' cy='50' r='48' fill='%231E3A8A'/><text x='50' y='65' text-anchor='middle' font-size='60' font-family='Inter, Arial' fill='white'>L</text></svg>`
              )}`}
            />
            <span>LexBaux</span>
          </div>
          <nav className="hidden sm:block text-sm text-slate-600">
            <a href="#features" className="ml-4 hover:underline">Fonctionnalités</a>
            <a href="#how" className="ml-4 hover:underline">Méthode</a>
            <a href="#pricing" className="ml-4 hover:underline">Tarifs</a>
            <a href="#faq" className="ml-4 hover:underline">FAQ</a>
            <Link href="/mentions-legales" className="ml-4 hover:underline">
  Mentions légales
</Link>
          </nav>
        </div>
      </header>

      {/* HERO */}
      <section className="bg-gradient-to-b from-orange-50 to-white">
        <div className="container mx-auto max-w-[1120px] px-5 py-16">
          <h1 className="text-4xl md:text-5xl font-extrabold tracking-tight">
            L’audit IA qui sécurise votre <span className="text-orange-600">bail commercial</span>
          </h1>
          <p className="mt-4 text-lg text-slate-600 max-w-[60ch]">
            LexBaux — l’audit IA des baux commerciaux pour PME. Évitez les clauses piégeuses avant de signer.
            Rapport clair en quelques minutes : points d’attention, impacts financiers et check-list de négociation.
          </p>
          <div className="mt-6 flex flex-wrap gap-3">
            <a href="#uploader" className="inline-flex items-center gap-2 rounded-[14px] bg-orange-600 text-white font-semibold px-4 py-3 border border-orange-600 hover:bg-orange-700">
              <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor">
                <path strokeWidth="2" d="M12 16V4m0 0 4 4m-4-4-4 4M4 16v2a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-2" />
              </svg>
              Déposer un bail (PDF)
            </a>
            {report && (
  <div id="report-view" className="mt-8">
    <ReportView report={report} />
  </div>
)}

           <button
  onClick={showExample}
  className="inline-flex items-center gap-2 rounded-[14px] bg-white font-semibold px-4 py-2 border border-slate-200 text-slate-700 hover:bg-slate-50"
>
  Voir un exemple de rapport
</button>

          </div>
          <div className="mt-4 flex flex-wrap gap-4 text-slate-600 text-[15px]">
            {["RGPD","Données chiffrées","Rapport en 10 min"].map((txt) => (
              <span key={txt} className="inline-flex items-center gap-1">
                <svg className="text-emerald-600" viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor">
                  <path strokeWidth="2" d="m5 13 4 4L19 7" />
                </svg>
                {txt}
              </span>
            ))}
          </div>
        </div>
      </section>

      {/* UPLOADER (branché à l'API) */}
      <section id="uploader" className="py-12">
        <div className="container mx-auto max-w-[1120px] px-5">
          <div className="rounded-2xl border border-slate-200 overflow-hidden bg-white">
            <div className="flex items-start gap-3 border-b border-slate-200 p-5">
              <div className="inline-flex items-center justify-center bg-orange-100 text-orange-600 rounded-xl w-10 h-10">
                <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor">
                  <path strokeWidth="2" d="M4 17v2a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-2M7 9l5-5 5 5M12 4v12"/>
                </svg>
              </div>
              <div>
                <div className="font-semibold">Commencer un audit</div>
                <div className="text-sm text-slate-500">Importez un PDF de votre projet de bail commercial.</div>
              </div>
            </div>

            <div className="p-5">
              <button
                onClick={onPickFile}
                className="block w-full border-2 border-dashed border-slate-200 rounded-2xl p-8 text-center hover:bg-orange-50 transition"
              >
                Glissez-déposez votre fichier ici
                <div className="text-sm text-slate-500">ou cliquez pour parcourir</div>
              </button>

              <input
                ref={fileInputRef}
                type="file"
                accept="application/pdf"
                className="hidden"
                onChange={onFileChange}
              />

              {fileName && (
                <div className="mt-3 text-sm text-slate-600">
                  Fichier prêt : <span className="font-medium">{fileName}</span>
                </div>
              )}

              <div className="mt-4 flex justify-end gap-2">
                <button
                  onClick={onCancel}
                  className="inline-flex items-center rounded-[14px] bg-white font-semibold px-4 py-2 border border-slate-200 hover:bg-slate-50"
                >
                  Annuler
                </button>
                <button
                  onClick={onAnalyze}
                  disabled={loading || !file}
                  className="inline-flex items-center rounded-[14px] bg-orange-600 text-white font-semibold px-4 py-2 border border-orange-600 hover:bg-orange-700 disabled:opacity-60"
                >
                  {loading ? "Analyse en cours…" : "Lancer l’analyse"}
                </button>
              </div>

              {/* Messages / Résultats */}
              {errorMsg && (
                <div className="mt-4 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-800">
                  {errorMsg}
                </div>
              )}

              
            </div>
          </div>
        </div>
      </section>

      {/* FEATURES */}
      <section id="features" className="py-14">
        <div className="container mx-auto max-w-[1120px] px-5">
          <h2 className="text-3xl font-bold">Tout ce qu’il faut pour signer en confiance</h2>
          <p className="text-slate-600 mt-1">De l’extraction des clauses à la synthèse actionnable, l’IA vous assiste à chaque étape.</p>
          <div className="grid gap-5 mt-6 sm:grid-cols-2 lg:grid-cols-3">
            {[
              ["🔎","Extraction & lecture","OCR des PDF scannés, repérage automatique des clauses et annexes."],
              ["✅","Conformité & alertes","Détection des clauses déséquilibrées ou interdites."],
              ["⚖️","Impact financier","Indexation, charges récupérables, garanties, pénalités."],
              ["🧾","Rapport exploitable","Synthèse claire en 5–10 min : rouge / orange / vert."],
              ["⏱️","Gain de temps","40 pages compilées en 1 page décisionnelle."],
              ["📚","Traçabilité","Justifications et références légales affichées."],
            ].map(([icon,title,desc]) => (
              <div key={title as string} className="rounded-2xl border border-slate-200 bg-white">
                <div className="flex items-start gap-3 p-5 border-b border-slate-200">
                  <div className="inline-flex items-center justify-center rounded-xl bg-orange-50 text-orange-700 w-10 h-10">
                    <span aria-hidden>{icon as string}</span>
                  </div>
                  <div>
                    <div className="font-semibold">{title}</div>
                    <div className="text-sm text-slate-600">{desc}</div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* HOW IT WORKS */}
      <section id="how" className="py-14 bg-orange-50/60 border-y border-slate-200">
        <div className="container mx-auto max-w-[1120px] px-5">
          <h2 className="text-3xl font-bold">Comment ça marche</h2>
          <div className="grid gap-5 mt-6 lg:grid-cols-3">
            {[
              ["1","Import du bail","PDF/Scan. OCR automatique. Anonymisation optionnelle."],
              ["2","Analyse IA","Repérage des clauses, risques, impacts financiers."],
              ["3","Rapport & négociation","Synthèse actionnable + questions à poser."],
            ].map(([step,title,desc]) => (
              <div key={step} className="rounded-2xl border border-slate-200 bg-white">
                <div className="p-5">
                  <div className="inline-flex items-center gap-2">
                    <span className="bg-orange-600 text-white text-xs font-bold rounded-full px-2 py-1">Étape {step}</span>
                    <span className="font-semibold">{title}</span>
                  </div>
                  <div className="text-sm text-slate-600 mt-2">{desc}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* PRICING */}
      <section id="pricing" className="py-14">
        <div className="container mx-auto max-w-[1120px] px-5">
          <h2 className="text-3xl font-bold text-center">Tarifs transparents</h2>
          <p className="text-slate-600 text-center mt-1">Payez à l’usage ou optez pour la sérénité annuelle. Pas de frais cachés.</p>
          <div className="grid gap-5 mt-8 md:grid-cols-2">
            <div className="rounded-2xl border-2 border-orange-200 bg-white p-6">
              <div className="flex items-center justify-between">
                <h3 className="font-semibold text-xl">Audit ponctuel</h3>
                <span className="text-xs font-bold rounded-full bg-slate-100 text-slate-700 px-2 py-1">Le plus direct</span>
              </div>
              <div className="text-4xl font-extrabold mt-2">200€</div>
              <div className="text-sm text-slate-500">/ bail (indicatif)</div>
              <ul className="mt-4 text-sm text-slate-700 space-y-1">
                <li>✅ Analyse complète en 5–10 min</li>
                <li>✅ Synthèse (PDF) + check-list</li>
                <li>✅ Alertes clauses sensibles</li>
                <li>✅ Partage avec votre expert-comptable</li>
              </ul>
              <div className="mt-4">
                <a href="#uploader" className="inline-flex items-center rounded-[14px] bg-orange-600 text-white font-semibold px-4 py-2 border border-orange-600 hover:bg-orange-700">Démarrer un audit</a>
              </div>
            </div>

            <div className="rounded-2xl border-2 border-orange-600 bg-white p-6">
              <div className="flex items-center justify-between">
                <h3 className="font-semibold text-xl">Pack Sérénité</h3>
                <span className="text-xs font-bold rounded-full bg-orange-600 text-white px-2 py-1">Recommandé</span>
              </div>
              <div className="text-4xl font-extrabold mt-2">600€</div>
              <div className="text-sm text-slate-500">/ an (indicatif)</div>
              <ul className="mt-4 text-sm text-slate-700 space-y-1">
                <li>✅ Jusqu’à 5 audits inclus</li>
                <li>✅ Alertes légales pertinentes</li>
                <li>✅ Support prioritaire</li>
                <li>✅ Historique & comparaisons de versions</li>
              </ul>
              <div className="mt-4">
               <a href="#uploader" className="inline-flex items-center rounded-[14px] bg-orange-600 text-white font-semibold px-4 py-2 border border-orange-600 hover:bg-orange-700">Démarrer un audit</a>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* DEMO LEAD FORM */}
      <section id="demo" className="py-14 bg-slate-50 border-y border-slate-200">
        <div className="container mx-auto max-w-[920px] px-5 text-center">
          <h3 className="text-2xl font-bold">Demander une démo</h3>
          <p className="mt-2 text-slate-600">Laissez votre email. Nous vous enverrons un exemple de rapport et un créneau.</p>
          <DemoForm />
        </div>
      </section>

      {/* FAQ */}
      <section id="faq" className="py-14">
        <div className="container mx-auto max-w-[920px] px-5">
          <h2 className="text-3xl font-bold">Questions fréquentes</h2>
          <div className="mt-5 space-y-3">
            {[
              ["Est-ce un conseil juridique ?", "Non. C’est un outil d’analyse et d’aide à la décision. Pour une consultation individualisée, adressez-vous à un professionnel du droit."],
              ["Quels types de baux sont couverts ?", "Baux commerciaux standards (3-6-9), dérogatoires/temporaires en V1. D’autres baux seront ajoutés progressivement."],
              ["Mes documents sont-ils protégés ?", "Hébergement conforme RGPD, chiffrement en transit et au repos. Vos fichiers ne sont pas utilisés pour entraîner des modèles publics."],
              ["Combien de temps prend l’audit ?", "Quelques minutes pour une première synthèse. Le rapport final arrive sous 10 minutes dans la plupart des cas."],
            ].map(([q,a]) => (
              <details key={q as string} className="border border-slate-200 rounded-xl p-4">
                <summary className="font-semibold cursor-pointer">{q}</summary>
                <p className="text-slate-600 mt-2">{a}</p>
              </details>
            ))}
          </div>
        </div>
      </section>

      {/* DISCLAIMER */}
      <section className="py-8">
        <div className="container mx-auto max-w-[1120px] px-5 text-sm text-slate-600">
          <p><strong>Avertissement :</strong> LexBaux est un outil d’analyse automatisée. Il ne fournit pas un conseil juridique personnalisé. Pour un avis circonstancié, consultez un avocat ou un notaire.</p>
        </div>
      </section>

      {/* FOOTER */}
      <footer className="border-t border-slate-200 py-8">
        <div className="container mx-auto max-w-[1120px] px-5 grid grid-cols-1 sm:grid-cols-[1fr_auto] gap-4 items-center text-slate-600 text-sm">
          <div className="flex items-center gap-2">
            <img
              alt="LexBaux"
              className="h-6 w-6 rounded-full"
              src={`data:image/svg+xml;utf8,${encodeURIComponent(
                `<?xml version="1.0"?><svg xmlns='http://www.w3.org/2000/svg' width='22' height='22' viewBox='0 0 100 100'><circle cx='50' cy='50' r='48' fill='%231E3A8A'/><text x='50' y='65' text-anchor='middle' font-size='60' font-family='Inter, Arial' fill='white'>L</text></svg>`
              )}`}
            />
            <strong>LexBaux</strong>
          </div>
          <div className="text-right text-sm text-slate-500">
  © {new Date().getFullYear()}{" "}
  <a href="/mentions-legales" className="underline hover:text-slate-700">
    LexBaux — Tous droits réservés
  </a>
</div>

        </div>
      </footer>
    </main>
  );
}

/* -------- Components -------- */

function DemoForm() {
  const [email, setEmail] = useState("");
  function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    alert(`Merci ! Nous revenons vers vous par email.`);
    setEmail("");
  }
  return (
    <form onSubmit={onSubmit} className="mt-5 flex flex-wrap justify-center gap-3">
      <input
        type="email"
        required
        placeholder="votre@email.com"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        className="min-w-[260px] flex-1 rounded-xl border border-slate-200 px-4 py-3"
      />
      <button
        type="submit"
        className="inline-flex items-center rounded-[14px] bg-orange-600 text-white font-semibold px-4 py-3 border border-orange-600 hover:bg-orange-700"
      >
        Recevoir la démo
      </button>
    </form>
  );
}
