// app/rapport/page.tsx
import { Suspense } from "react";
import RapportClient from "./rapport-client";

export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";
export const revalidate = 0;

export default function RapportPage() {
  return (
    <Suspense fallback={<div className="p-6">Chargement du rapport…</div>}>
      <RapportClient />
    </Suspense>
  );
}
