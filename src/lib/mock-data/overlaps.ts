/**
 * DEMONSTRATION DATA ONLY
 * -----------------------
 * Algorithmic candidate overlaps for demonstrating multi-signal comparison.
 * Note: Signal scores represent pattern detection indicators, NOT confirmed duplicates.
 * Final determinations require explicit human adjudication.
 */

import { OverlapCandidate } from "../types";

export const DEMO_OVERLAPS: OverlapCandidate[] = [
  {
    id: "OVL-2026-01",
    sourceComplaintId: "AICTE-2026-8401",
    targetComplaintId: "AICTE-2026-8402",
    signalScore: 88,
    matchingSignals: [
      {
        type: "Same Institution ID",
        detail: "Both cases target AICTE-INST-8821 (Apex Institute of Advanced Technology)",
      },
      {
        type: "Text Similarity",
        detail: "89% semantic overlap on unauthorized development and admission fees",
      },
      {
        type: "Identical Faculty Named",
        detail: "Admissions In-charge Dr. R. K. Deshmukh cited in both allegations",
      },
      {
        type: "Temporal Proximity",
        detail: "Filed within 4 calendar days (Sep 12 vs Sep 16, 2026)",
      },
    ],
    reviewStatus: "Pending",
  },
  {
    id: "OVL-2026-02",
    sourceComplaintId: "AICTE-2026-8403",
    targetComplaintId: "AICTE-2026-8404",
    signalScore: 94,
    matchingSignals: [
      {
        type: "Same Institution ID",
        detail: "Both cases target AICTE-INST-4412 (National Polytechnic & Engineering College)",
      },
      {
        type: "Text Similarity",
        detail: "91% semantic overlap regarding hostel intimidation and warden inaction",
      },
      {
        type: "Identical Faculty Named",
        detail: "Hostel Block-C warden and principal named in both filings",
      },
      {
        type: "Temporal Proximity",
        detail: "Filed within 24 hours (Oct 18 vs Oct 19, 2026)",
      },
    ],
    reviewStatus: "Pending",
  },
  {
    id: "OVL-2026-03",
    sourceComplaintId: "AICTE-2026-8405",
    targetComplaintId: "AICTE-2026-8406",
    signalScore: 78,
    matchingSignals: [
      {
        type: "Same Institution ID",
        detail: "Both cases target AICTE-INST-1290 (Saraswati College of Engineering & Research)",
      },
      {
        type: "Text Similarity",
        detail: "74% semantic overlap concerning faculty salary non-payment and deductions",
      },
      {
        type: "Temporal Proximity",
        detail: "Filed within 13 days of each other during academic term start",
      },
    ],
    reviewStatus: "Linked",
    adjudicatedBy: "Dr. S. Nair (Deputy Director, FDC)",
    adjudicatedAt: "2026-09-08 14:30",
    adjudicationNote:
      "Cases demonstrate systemic salary non-payment at AICTE-INST-1290. Clustered for joint scrutiny committee inquiry.",
  },
  {
    id: "OVL-2026-04",
    sourceComplaintId: "AICTE-2026-8401",
    targetComplaintId: "AICTE-2026-8410",
    signalScore: 54,
    matchingSignals: [
      {
        type: "Text Similarity",
        detail: "54% semantic phrasing match regarding extra institutional fees",
      },
    ],
    reviewStatus: "Independent",
    adjudicatedBy: "A. Verma (Senior Scrutiny Officer, Legal)",
    adjudicatedAt: "2026-10-14 11:15",
    adjudicationNote:
      "Institutions are distinct and located in different regions (Maharashtra vs West Bengal). No common personnel or shared institutional pattern; confirmed independent.",
  },
];
