import React, { Suspense, use } from "react";
import { DEMO_COMPLAINTS } from "../../../lib/mock-data/complaints";
import { ComplaintDetailView } from "../../../components/complaints/complaint-detail-view";

export function generateStaticParams() {
  return DEMO_COMPLAINTS.map((c) => ({ id: c.id }));
}

function ComplaintDetailContent({ paramsPromise }: { paramsPromise: Promise<{ id: string }> }) {
  const { id } = use(paramsPromise);
  return <ComplaintDetailView id={id} />;
}

export default function ComplaintDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  return (
    <Suspense fallback={<div className="p-8 text-xs text-[#697386]">Loading complaint dossier...</div>}>
      <ComplaintDetailContent paramsPromise={params} />
    </Suspense>
  );
}
