// components/GeneralInfoCard.tsx
"use client";
import { GeneralInfo } from "../types/general-info";

function Row({ label, value }: { label: string; value?: string }) {
  const v = value && value.trim() ? value : "Non trouvé";
  const isMissing = v === "Non trouvé";
  return (
    <div className="grid grid-cols-12 gap-4 py-2">
      <div className="col-span-4 text-sm text-slate-500">{label}</div>
      <div className={"col-span-8 text-sm " + (isMissing ? "text-slate-400 italic" : "text-slate-800")}>
        {v}
      </div>
    </div>
  );
}

export default function GeneralInfoCard({ info }: { info: GeneralInfo }) {
  return (
    <section className="mt-6 rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
      <h3 className="text-base font-semibold text-slate-800">Informations générales</h3>

      <div className="mt-4 space-y-2">
        <Row label="Bailleur (nom)" value={info.bailleurNom} />
        <Row label="Bailleur (forme sociale)" value={info.bailleurForme} />
        <Row label="Bailleur (RCS / SIREN)" value={info.bailleurRCS} />
        <div className="h-px bg-slate-100 my-2" />
        <Row label="Preneur (nom)" value={info.preneurNom} />
        <Row label="Preneur (forme sociale)" value={info.preneurForme} />
        <Row label="Preneur (RCS / SIREN)" value={info.preneurRCS} />
        <div className="h-px bg-slate-100 my-2" />
        <Row label="Qualité et pouvoirs des signataires" value={info.qualitePouvoirsSignataires} />
        <Row label="Désignation du bien loué" value={info.designationBien} />
        <Row label="Destination des locaux" value={info.destinationLocaux} />
        <Row label="Loyer commercial" value={info.loyerCommercial} />
      </div>
    </section>
  );
}
