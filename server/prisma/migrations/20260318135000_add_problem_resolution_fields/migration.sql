-- Add missing columns to Problem table
ALTER TABLE "Problem"
ADD COLUMN "resolutionProofImages" TEXT[] DEFAULT ARRAY[]::TEXT[],
ADD COLUMN "resolvedAt" TIMESTAMP(3);
