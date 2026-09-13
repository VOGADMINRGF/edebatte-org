-- CreateEnum
CREATE TYPE "ContentKind" AS ENUM ('SWIPE', 'EVENT', 'SUNDAY_POLL');

-- CreateEnum
CREATE TYPE "PublishStatus" AS ENUM ('draft', 'review', 'published', 'archived');

-- CreateEnum
CREATE TYPE "RegionMode" AS ENUM ('AUTO', 'MANUAL');

-- CreateEnum
CREATE TYPE "Locale" AS ENUM ('de', 'en', 'fr', 'it', 'es', 'pl', 'uk', 'ru', 'tr', 'hi', 'zh', 'ar');

-- CreateEnum
CREATE TYPE "Stance" AS ENUM ('FOR', 'AGAINST', 'NEUTRAL');

-- CreateEnum
CREATE TYPE "UnitKind" AS ENUM ('claim', 'opinion', 'policy', 'question', 'prediction');

-- CreateEnum
CREATE TYPE "ReviewStatus" AS ENUM ('OPEN', 'IN_PROGRESS', 'VERIFIED', 'REFUTED', 'MIXED', 'STALE');

-- CreateEnum
CREATE TYPE "Interest" AS ENUM ('interested', 'ignored', 'undecided');

-- CreateEnum
CREATE TYPE "Triage" AS ENUM ('none', 'watchlist', 'escalate');

-- CreateEnum
CREATE TYPE "SourceKind" AS ENUM ('USER', 'NEWS', 'SOCIAL', 'API', 'SYSTEM');

-- CreateEnum
CREATE TYPE "StreamKind" AS ENUM ('EVENT', 'METRIC', 'LOG');

-- CreateEnum
CREATE TYPE "StreamStatus" AS ENUM ('ACCEPTED', 'APPLIED', 'REJECTED');

-- CreateTable
CREATE TABLE "Topic" (
    "id" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "locale" "Locale" NOT NULL DEFAULT 'de',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Topic_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Tag" (
    "id" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "label" TEXT NOT NULL,

    CONSTRAINT "Tag_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TopicTag" (
    "id" TEXT NOT NULL,
    "topicId" TEXT NOT NULL,
    "tagId" TEXT NOT NULL,

    CONSTRAINT "TopicTag_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ItemTag" (
    "id" TEXT NOT NULL,
    "itemId" TEXT NOT NULL,
    "tagId" TEXT NOT NULL,

    CONSTRAINT "ItemTag_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Region" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "level" INTEGER NOT NULL,
    "parentId" TEXT,
    "meta" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Region_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RegionClosure" (
    "id" TEXT NOT NULL,
    "ancestorId" TEXT NOT NULL,
    "descendantId" TEXT NOT NULL,
    "depth" INTEGER NOT NULL,

    CONSTRAINT "RegionClosure_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ContentItem" (
    "id" TEXT NOT NULL,
    "kind" "ContentKind" NOT NULL,
    "topicId" TEXT NOT NULL,
    "locale" "Locale" NOT NULL DEFAULT 'de',
    "title" TEXT,
    "text" TEXT NOT NULL,
    "richText" TEXT,
    "order" INTEGER NOT NULL DEFAULT 0,
    "status" "PublishStatus" NOT NULL DEFAULT 'draft',
    "authorName" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "publishAt" TIMESTAMP(3),
    "expireAt" TIMESTAMP(3),
    "regionMode" "RegionMode" NOT NULL DEFAULT 'AUTO',
    "regionManualId" TEXT,
    "regionAuto" JSONB,
    "regionEffectiveId" TEXT,
    "validation" JSONB,
    "meta" JSONB,

    CONSTRAINT "ContentItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AnswerOption" (
    "id" TEXT NOT NULL,
    "itemId" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "value" TEXT NOT NULL,
    "order" INTEGER NOT NULL DEFAULT 0,
    "exclusive" BOOLEAN NOT NULL DEFAULT false,
    "meta" JSONB,

    CONSTRAINT "AnswerOption_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FactcheckJob" (
    "id" TEXT NOT NULL,
    "jobId" TEXT NOT NULL,
    "contributionId" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "tokensUsed" INTEGER NOT NULL DEFAULT 0,
    "durationMs" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "FactcheckJob_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FactcheckClaim" (
    "id" TEXT NOT NULL,
    "jobId" TEXT NOT NULL,
    "text" TEXT NOT NULL,
    "language" TEXT,
    "topic" TEXT,
    "falsifiable" BOOLEAN NOT NULL DEFAULT true,
    "frames" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "rhetoricalFlags" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "canonicalKey" TEXT NOT NULL,
    "scope" TEXT,
    "timeframe" TEXT,
    "status" "ReviewStatus" NOT NULL DEFAULT 'OPEN',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "FactcheckClaim_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ProviderRun" (
    "id" TEXT NOT NULL,
    "claimId" TEXT NOT NULL,
    "provider" TEXT NOT NULL,
    "verdict" TEXT NOT NULL,
    "confidence" DOUBLE PRECISION NOT NULL,
    "costTokens" INTEGER NOT NULL DEFAULT 0,
    "latencyMs" INTEGER NOT NULL DEFAULT 0,
    "raw" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ProviderRun_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ConsensusRun" (
    "id" TEXT NOT NULL,
    "claimId" TEXT NOT NULL,
    "method" TEXT NOT NULL,
    "verdict" TEXT NOT NULL,
    "confidence" DOUBLE PRECISION NOT NULL,
    "balanceScore" DOUBLE PRECISION NOT NULL,
    "diversityIndex" DOUBLE PRECISION NOT NULL,
    "providers" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ConsensusRun_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Evidence" (
    "id" TEXT NOT NULL,
    "claimId" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "domain" TEXT NOT NULL,
    "stance" "Stance" NOT NULL,
    "snapshotHash" TEXT,
    "firstSeenAt" TIMESTAMP(3) DEFAULT CURRENT_TIMESTAMP,
    "trustScore" INTEGER,

    CONSTRAINT "Evidence_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "VerdictVersion" (
    "id" TEXT NOT NULL,
    "claimId" TEXT NOT NULL,
    "verdict" TEXT NOT NULL,
    "confidence" DOUBLE PRECISION NOT NULL,
    "asOf" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "supersedes" TEXT,

    CONSTRAINT "VerdictVersion_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FactcheckResult" (
    "id" TEXT NOT NULL,
    "jobId" TEXT NOT NULL,
    "verdict" TEXT NOT NULL,
    "rawOutput" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "FactcheckResult_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AuditLog" (
    "id" TEXT NOT NULL,
    "entityType" TEXT NOT NULL,
    "entityId" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "actor" TEXT NOT NULL,
    "at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "meta" JSONB NOT NULL,

    CONSTRAINT "AuditLog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ExtractedUnit" (
    "id" TEXT NOT NULL,
    "itemId" TEXT,
    "statementId" TEXT,
    "kind" "UnitKind" NOT NULL,
    "text" TEXT NOT NULL,
    "spanStart" INTEGER NOT NULL,
    "spanEnd" INTEGER NOT NULL,
    "confidence" DOUBLE PRECISION NOT NULL,
    "canonicalKey" TEXT NOT NULL,
    "scope" TEXT,
    "timeframe" TEXT,
    "claimId" TEXT,
    "interest" "Interest" NOT NULL DEFAULT 'undecided',
    "triage" "Triage" NOT NULL DEFAULT 'none',
    "editorNote" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ExtractedUnit_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Finding" (
    "id" TEXT NOT NULL,
    "claimId" TEXT NOT NULL,
    "summary" TEXT NOT NULL,
    "outcome" TEXT NOT NULL,
    "rationale" TEXT NOT NULL,
    "metrics" JSONB,
    "comparedJurisdictions" JSONB,
    "lastChecked" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Finding_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Topic_slug_key" ON "Topic"("slug");

-- CreateIndex
CREATE INDEX "Topic_locale_idx" ON "Topic"("locale");

-- CreateIndex
CREATE INDEX "Topic_createdAt_idx" ON "Topic"("createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "Tag_slug_key" ON "Tag"("slug");

-- CreateIndex
CREATE INDEX "TopicTag_topicId_idx" ON "TopicTag"("topicId");

-- CreateIndex
CREATE INDEX "TopicTag_tagId_idx" ON "TopicTag"("tagId");

-- CreateIndex
CREATE UNIQUE INDEX "TopicTag_topicId_tagId_key" ON "TopicTag"("topicId", "tagId");

-- CreateIndex
CREATE INDEX "ItemTag_itemId_idx" ON "ItemTag"("itemId");

-- CreateIndex
CREATE INDEX "ItemTag_tagId_idx" ON "ItemTag"("tagId");

-- CreateIndex
CREATE UNIQUE INDEX "ItemTag_itemId_tagId_key" ON "ItemTag"("itemId", "tagId");

-- CreateIndex
CREATE UNIQUE INDEX "Region_code_key" ON "Region"("code");

-- CreateIndex
CREATE INDEX "Region_level_idx" ON "Region"("level");

-- CreateIndex
CREATE INDEX "RegionClosure_ancestorId_depth_idx" ON "RegionClosure"("ancestorId", "depth");

-- CreateIndex
CREATE INDEX "RegionClosure_descendantId_depth_idx" ON "RegionClosure"("descendantId", "depth");

-- CreateIndex
CREATE UNIQUE INDEX "RegionClosure_ancestorId_descendantId_key" ON "RegionClosure"("ancestorId", "descendantId");

-- CreateIndex
CREATE INDEX "ContentItem_kind_status_locale_idx" ON "ContentItem"("kind", "status", "locale");

-- CreateIndex
CREATE INDEX "ContentItem_publishAt_idx" ON "ContentItem"("publishAt");

-- CreateIndex
CREATE INDEX "ContentItem_topicId_idx" ON "ContentItem"("topicId");

-- CreateIndex
CREATE INDEX "ContentItem_regionEffectiveId_idx" ON "ContentItem"("regionEffectiveId");

-- CreateIndex
CREATE INDEX "ContentItem_createdAt_idx" ON "ContentItem"("createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "AnswerOption_itemId_order_key" ON "AnswerOption"("itemId", "order");

-- CreateIndex
CREATE UNIQUE INDEX "AnswerOption_itemId_value_key" ON "AnswerOption"("itemId", "value");

-- CreateIndex
CREATE UNIQUE INDEX "FactcheckJob_jobId_key" ON "FactcheckJob"("jobId");

-- CreateIndex
CREATE INDEX "FactcheckJob_status_createdAt_idx" ON "FactcheckJob"("status", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "FactcheckClaim_canonicalKey_key" ON "FactcheckClaim"("canonicalKey");

-- CreateIndex
CREATE INDEX "FactcheckClaim_jobId_createdAt_idx" ON "FactcheckClaim"("jobId", "createdAt");

-- CreateIndex
CREATE INDEX "FactcheckClaim_status_updatedAt_idx" ON "FactcheckClaim"("status", "updatedAt");

-- CreateIndex
CREATE INDEX "ProviderRun_claimId_provider_idx" ON "ProviderRun"("claimId", "provider");

-- CreateIndex
CREATE INDEX "ProviderRun_createdAt_idx" ON "ProviderRun"("createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "ConsensusRun_claimId_key" ON "ConsensusRun"("claimId");

-- CreateIndex
CREATE INDEX "Evidence_claimId_domain_idx" ON "Evidence"("claimId", "domain");

-- CreateIndex
CREATE INDEX "VerdictVersion_claimId_asOf_idx" ON "VerdictVersion"("claimId", "asOf");

-- CreateIndex
CREATE INDEX "FactcheckResult_jobId_createdAt_idx" ON "FactcheckResult"("jobId", "createdAt");

-- CreateIndex
CREATE INDEX "AuditLog_entityType_at_idx" ON "AuditLog"("entityType", "at");

-- CreateIndex
CREATE INDEX "ExtractedUnit_kind_canonicalKey_idx" ON "ExtractedUnit"("kind", "canonicalKey");

-- CreateIndex
CREATE INDEX "ExtractedUnit_interest_triage_idx" ON "ExtractedUnit"("interest", "triage");

-- CreateIndex
CREATE INDEX "ExtractedUnit_itemId_idx" ON "ExtractedUnit"("itemId");

-- CreateIndex
CREATE INDEX "ExtractedUnit_statementId_idx" ON "ExtractedUnit"("statementId");

-- CreateIndex
CREATE UNIQUE INDEX "Finding_claimId_key" ON "Finding"("claimId");

-- AddForeignKey
ALTER TABLE "TopicTag" ADD CONSTRAINT "TopicTag_topicId_fkey" FOREIGN KEY ("topicId") REFERENCES "Topic"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TopicTag" ADD CONSTRAINT "TopicTag_tagId_fkey" FOREIGN KEY ("tagId") REFERENCES "Tag"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ItemTag" ADD CONSTRAINT "ItemTag_itemId_fkey" FOREIGN KEY ("itemId") REFERENCES "ContentItem"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ItemTag" ADD CONSTRAINT "ItemTag_tagId_fkey" FOREIGN KEY ("tagId") REFERENCES "Tag"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Region" ADD CONSTRAINT "Region_parentId_fkey" FOREIGN KEY ("parentId") REFERENCES "Region"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RegionClosure" ADD CONSTRAINT "RegionClosure_ancestorId_fkey" FOREIGN KEY ("ancestorId") REFERENCES "Region"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RegionClosure" ADD CONSTRAINT "RegionClosure_descendantId_fkey" FOREIGN KEY ("descendantId") REFERENCES "Region"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ContentItem" ADD CONSTRAINT "ContentItem_topicId_fkey" FOREIGN KEY ("topicId") REFERENCES "Topic"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ContentItem" ADD CONSTRAINT "ContentItem_regionManualId_fkey" FOREIGN KEY ("regionManualId") REFERENCES "Region"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ContentItem" ADD CONSTRAINT "ContentItem_regionEffectiveId_fkey" FOREIGN KEY ("regionEffectiveId") REFERENCES "Region"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AnswerOption" ADD CONSTRAINT "AnswerOption_itemId_fkey" FOREIGN KEY ("itemId") REFERENCES "ContentItem"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FactcheckClaim" ADD CONSTRAINT "FactcheckClaim_jobId_fkey" FOREIGN KEY ("jobId") REFERENCES "FactcheckJob"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProviderRun" ADD CONSTRAINT "ProviderRun_claimId_fkey" FOREIGN KEY ("claimId") REFERENCES "FactcheckClaim"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ConsensusRun" ADD CONSTRAINT "ConsensusRun_claimId_fkey" FOREIGN KEY ("claimId") REFERENCES "FactcheckClaim"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Evidence" ADD CONSTRAINT "Evidence_claimId_fkey" FOREIGN KEY ("claimId") REFERENCES "FactcheckClaim"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "VerdictVersion" ADD CONSTRAINT "VerdictVersion_claimId_fkey" FOREIGN KEY ("claimId") REFERENCES "FactcheckClaim"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FactcheckResult" ADD CONSTRAINT "FactcheckResult_jobId_fkey" FOREIGN KEY ("jobId") REFERENCES "FactcheckJob"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ExtractedUnit" ADD CONSTRAINT "ExtractedUnit_itemId_fkey" FOREIGN KEY ("itemId") REFERENCES "ContentItem"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ExtractedUnit" ADD CONSTRAINT "ExtractedUnit_claimId_fkey" FOREIGN KEY ("claimId") REFERENCES "FactcheckClaim"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Finding" ADD CONSTRAINT "Finding_claimId_fkey" FOREIGN KEY ("claimId") REFERENCES "FactcheckClaim"("id") ON DELETE CASCADE ON UPDATE CASCADE;
