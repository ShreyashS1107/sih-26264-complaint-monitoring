-- CreateEnum
CREATE TYPE "ApprovalStatus" AS ENUM ('APPROVED', 'UNDER_SCRUTINY', 'PROVISIONAL', 'WITHDRAWN');

-- CreateEnum
CREATE TYPE "OfficerRole" AS ENUM ('CASE_OFFICER', 'SENIOR_SCRUTINIZER', 'BUREAU_HEAD', 'CENTRAL_ADMIN');

-- CreateEnum
CREATE TYPE "ComplaintPriority" AS ENUM ('LOW', 'MEDIUM', 'HIGH', 'CRITICAL');

-- CreateEnum
CREATE TYPE "ComplaintStatus" AS ENUM ('SUBMITTED', 'UNDER_PRELIMINARY_REVIEW', 'UNDER_INQUIRY', 'COORDINATED_REVIEW', 'RESOLVED', 'CLOSED', 'DISMISSED');

-- CreateEnum
CREATE TYPE "ComplaintCategory" AS ENUM ('FEE_ANOMALY', 'INFRASTRUCTURE_DEFICIT', 'FACULTY_NON_COMPLIANCE', 'HARASSMENT_RAGGING', 'ADMISSION_MALPRACTICE', 'UNAPPROVED_PROGRAM', 'OTHER');

-- CreateEnum
CREATE TYPE "ComplainantType" AS ENUM ('STUDENT', 'FACULTY', 'PARENT', 'CITIZEN', 'ANONYMOUS');

-- CreateEnum
CREATE TYPE "ActionType" AS ENUM ('STATUS_CHANGE', 'OFFICER_ASSIGNED', 'NOTE_ADDED', 'DOCUMENT_UPLOADED', 'OVERLAP_LINKED', 'OVERLAP_DISMISSED', 'JOINT_REVIEW_REQUESTED', 'RESOLUTION_ISSUED');

-- CreateEnum
CREATE TYPE "OverlapReviewStatus" AS ENUM ('PENDING_REVIEW', 'FLAGGED_JOINT_REVIEW', 'CONFIRMED_OVERLAP', 'DISMISSED_INDEPENDENT');

-- CreateTable
CREATE TABLE "Institution" (
    "id" TEXT NOT NULL,
    "permanentId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "state" TEXT NOT NULL,
    "district" TEXT NOT NULL,
    "address" TEXT,
    "pinCode" TEXT,
    "institutionType" TEXT NOT NULL,
    "approvalStatus" "ApprovalStatus" NOT NULL DEFAULT 'APPROVED',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Institution_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Bureau" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Bureau_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Officer" (
    "id" TEXT NOT NULL,
    "badgeNumber" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "bureauId" TEXT NOT NULL,
    "role" "OfficerRole" NOT NULL DEFAULT 'CASE_OFFICER',
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Officer_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Complaint" (
    "id" TEXT NOT NULL,
    "complaintNumber" TEXT NOT NULL,
    "originalBureauRef" TEXT NOT NULL,
    "institutionId" TEXT NOT NULL,
    "bureauId" TEXT NOT NULL,
    "assignedOfficerId" TEXT,
    "subject" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "category" "ComplaintCategory" NOT NULL DEFAULT 'OTHER',
    "priority" "ComplaintPriority" NOT NULL DEFAULT 'MEDIUM',
    "status" "ComplaintStatus" NOT NULL DEFAULT 'SUBMITTED',
    "incidentDate" TIMESTAMP(3),
    "complainantType" "ComplainantType" NOT NULL DEFAULT 'STUDENT',
    "complainantMaskedId" TEXT,
    "resolvedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Complaint_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CaseAction" (
    "id" TEXT NOT NULL,
    "complaintId" TEXT NOT NULL,
    "officerId" TEXT,
    "actionType" "ActionType" NOT NULL,
    "previousStatus" "ComplaintStatus",
    "newStatus" "ComplaintStatus",
    "notes" TEXT,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CaseAction_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "OverlapCandidate" (
    "id" TEXT NOT NULL,
    "primaryComplaintId" TEXT NOT NULL,
    "candidateComplaintId" TEXT NOT NULL,
    "institutionId" TEXT NOT NULL,
    "overallScore" DOUBLE PRECISION NOT NULL,
    "entityScore" DOUBLE PRECISION NOT NULL,
    "subjectScore" DOUBLE PRECISION NOT NULL,
    "complainantScore" DOUBLE PRECISION NOT NULL,
    "temporalScore" DOUBLE PRECISION NOT NULL,
    "matchingSignals" JSONB NOT NULL,
    "reviewStatus" "OverlapReviewStatus" NOT NULL DEFAULT 'PENDING_REVIEW',
    "reviewNotes" TEXT,
    "reviewedById" TEXT,
    "reviewedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "OverlapCandidate_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AuditLog" (
    "id" TEXT NOT NULL,
    "entityType" TEXT NOT NULL,
    "entityId" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "actorId" TEXT,
    "actorRole" TEXT,
    "bureauId" TEXT,
    "details" JSONB NOT NULL,
    "ipAddress" TEXT,
    "timestamp" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AuditLog_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Institution_permanentId_key" ON "Institution"("permanentId");

-- CreateIndex
CREATE INDEX "Institution_permanentId_idx" ON "Institution"("permanentId");

-- CreateIndex
CREATE INDEX "Institution_state_district_idx" ON "Institution"("state", "district");

-- CreateIndex
CREATE INDEX "Institution_name_idx" ON "Institution"("name");

-- CreateIndex
CREATE UNIQUE INDEX "Bureau_code_key" ON "Bureau"("code");

-- CreateIndex
CREATE UNIQUE INDEX "Officer_badgeNumber_key" ON "Officer"("badgeNumber");

-- CreateIndex
CREATE UNIQUE INDEX "Officer_email_key" ON "Officer"("email");

-- CreateIndex
CREATE INDEX "Officer_bureauId_idx" ON "Officer"("bureauId");

-- CreateIndex
CREATE INDEX "Officer_role_idx" ON "Officer"("role");

-- CreateIndex
CREATE UNIQUE INDEX "Complaint_complaintNumber_key" ON "Complaint"("complaintNumber");

-- CreateIndex
CREATE INDEX "Complaint_institutionId_idx" ON "Complaint"("institutionId");

-- CreateIndex
CREATE INDEX "Complaint_bureauId_idx" ON "Complaint"("bureauId");

-- CreateIndex
CREATE INDEX "Complaint_status_idx" ON "Complaint"("status");

-- CreateIndex
CREATE INDEX "Complaint_priority_idx" ON "Complaint"("priority");

-- CreateIndex
CREATE INDEX "Complaint_category_idx" ON "Complaint"("category");

-- CreateIndex
CREATE INDEX "Complaint_createdAt_idx" ON "Complaint"("createdAt");

-- CreateIndex
CREATE INDEX "CaseAction_complaintId_idx" ON "CaseAction"("complaintId");

-- CreateIndex
CREATE INDEX "CaseAction_officerId_idx" ON "CaseAction"("officerId");

-- CreateIndex
CREATE INDEX "CaseAction_actionType_idx" ON "CaseAction"("actionType");

-- CreateIndex
CREATE INDEX "CaseAction_createdAt_idx" ON "CaseAction"("createdAt");

-- CreateIndex
CREATE INDEX "OverlapCandidate_institutionId_idx" ON "OverlapCandidate"("institutionId");

-- CreateIndex
CREATE INDEX "OverlapCandidate_reviewStatus_idx" ON "OverlapCandidate"("reviewStatus");

-- CreateIndex
CREATE INDEX "OverlapCandidate_overallScore_idx" ON "OverlapCandidate"("overallScore");

-- CreateIndex
CREATE UNIQUE INDEX "OverlapCandidate_primaryComplaintId_candidateComplaintId_key" ON "OverlapCandidate"("primaryComplaintId", "candidateComplaintId");

-- CreateIndex
CREATE INDEX "AuditLog_entityType_entityId_idx" ON "AuditLog"("entityType", "entityId");

-- CreateIndex
CREATE INDEX "AuditLog_timestamp_idx" ON "AuditLog"("timestamp");

-- CreateIndex
CREATE INDEX "AuditLog_actorId_idx" ON "AuditLog"("actorId");

-- AddForeignKey
ALTER TABLE "Officer" ADD CONSTRAINT "Officer_bureauId_fkey" FOREIGN KEY ("bureauId") REFERENCES "Bureau"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Complaint" ADD CONSTRAINT "Complaint_institutionId_fkey" FOREIGN KEY ("institutionId") REFERENCES "Institution"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Complaint" ADD CONSTRAINT "Complaint_bureauId_fkey" FOREIGN KEY ("bureauId") REFERENCES "Bureau"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Complaint" ADD CONSTRAINT "Complaint_assignedOfficerId_fkey" FOREIGN KEY ("assignedOfficerId") REFERENCES "Officer"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CaseAction" ADD CONSTRAINT "CaseAction_complaintId_fkey" FOREIGN KEY ("complaintId") REFERENCES "Complaint"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CaseAction" ADD CONSTRAINT "CaseAction_officerId_fkey" FOREIGN KEY ("officerId") REFERENCES "Officer"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OverlapCandidate" ADD CONSTRAINT "OverlapCandidate_primaryComplaintId_fkey" FOREIGN KEY ("primaryComplaintId") REFERENCES "Complaint"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OverlapCandidate" ADD CONSTRAINT "OverlapCandidate_candidateComplaintId_fkey" FOREIGN KEY ("candidateComplaintId") REFERENCES "Complaint"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OverlapCandidate" ADD CONSTRAINT "OverlapCandidate_institutionId_fkey" FOREIGN KEY ("institutionId") REFERENCES "Institution"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OverlapCandidate" ADD CONSTRAINT "OverlapCandidate_reviewedById_fkey" FOREIGN KEY ("reviewedById") REFERENCES "Officer"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AuditLog" ADD CONSTRAINT "AuditLog_actorId_fkey" FOREIGN KEY ("actorId") REFERENCES "Officer"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- CheckConstraints for OverlapCandidate:
-- 1. Enforce strict canonical ordering to prevent self-matches and reverse duplicate pairs:
ALTER TABLE "OverlapCandidate" ADD CONSTRAINT "OverlapCandidate_canonical_order" CHECK ("primaryComplaintId" < "candidateComplaintId");

-- 2. Enforce valid score bounds [0.0, 1.0] across all score dimensions:
ALTER TABLE "OverlapCandidate" ADD CONSTRAINT "OverlapCandidate_score_bounds" CHECK (
    "overallScore" >= 0.0 AND "overallScore" <= 1.0 AND
    "entityScore" >= 0.0 AND "entityScore" <= 1.0 AND
    "subjectScore" >= 0.0 AND "subjectScore" <= 1.0 AND
    "complainantScore" >= 0.0 AND "complainantScore" <= 1.0 AND
    "temporalScore" >= 0.0 AND "temporalScore" <= 1.0
);
