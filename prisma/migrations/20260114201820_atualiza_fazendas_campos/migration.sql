/*
  Warnings:

  - You are about to drop the column `area` on the `Fazenda` table. All the data in the column will be lost.
  - You are about to drop the column `localidade` on the `Fazenda` table. All the data in the column will be lost.

*/

-- 1) Adiciona updatedAt permitindo NULL (para não quebrar com dados existentes)
ALTER TABLE "Fazenda" ADD COLUMN "updatedAt" TIMESTAMP(3);

-- 2) Preenche registros antigos
UPDATE "Fazenda" SET "updatedAt" = NOW() WHERE "updatedAt" IS NULL;

-- 3) Agora sim trava como NOT NULL
ALTER TABLE "Fazenda" ALTER COLUMN "updatedAt" SET NOT NULL;

-- 4) Alterações restantes do schema
ALTER TABLE "Fazenda"
  DROP COLUMN "area",
  DROP COLUMN "localidade",
  ADD COLUMN "areaPlantadaHa" DOUBLE PRECISION,
  ADD COLUMN "areaTotalHa" DOUBLE PRECISION,
  ADD COLUMN "ie" TEXT,
  ADD COLUMN "mapaFazenda" TEXT[] DEFAULT ARRAY[]::TEXT[],
  ADD COLUMN "numeroCarEstadual" TEXT,
  ADD COLUMN "observacoes" TEXT;
