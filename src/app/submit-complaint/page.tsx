'use client';

import React, { useState } from 'react';
import { ComplaintSubmissionForm } from '../../components/complaints/complaint-submission-form';
import { ComplaintAnalysisReport } from '../../components/complaints/complaint-analysis-report';
import { ComplaintSubmissionResult } from '../../lib/types';

export default function SubmitComplaintPage() {
  const [submissionResult, setSubmissionResult] = useState<ComplaintSubmissionResult | null>(null);

  return (
    <div className="space-y-6">
      {submissionResult ? (
        <ComplaintAnalysisReport
          result={submissionResult}
          onReset={() => setSubmissionResult(null)}
        />
      ) : (
        <ComplaintSubmissionForm onSuccess={(result) => setSubmissionResult(result)} />
      )}
    </div>
  );
}
