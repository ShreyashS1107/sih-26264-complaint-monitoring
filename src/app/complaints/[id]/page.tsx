import React, { Suspense } from "react";
import { DEMO_COMPLAINTS } from "../../../lib/mock-data/complaints";
import { ComplaintDetailView } from "../../../components/complaints/complaint-detail-view";

export function generateStaticParams() {
  return DEMO_COMPLAINTS.map((c) => ({ id: c.id }));
}

export default async function ComplaintDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  return (
    <Suspense fallback={<div className="p-8 text-xs text-[#697386]">Loading complaint dossier {id}...</div>}>
      <ComplaintDetailView id={id} />
    </Suspense>
  );
}
