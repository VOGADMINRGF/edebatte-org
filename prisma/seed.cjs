// prisma/seed.cjs
const { PrismaClient, ContentKind, PublishStatus, RegionMode, PlanType } = require("@prisma/client");
const prisma = new PrismaClient();

function parsePriceCents(value, fallback) {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return fallback;
  return Math.max(0, Math.round(parsed));
}

async function upsertRegion(code, name, level, parentCode) {
  let parentId = null;
  if (parentCode) {
    const parent = await prisma.region.upsert({
      where: { code: parentCode },
      update: {},
      create: { code: parentCode, name: parentCode, level: Math.max(level - 1, 0) },
    });
    parentId = parent.id;
  }
  return prisma.region.upsert({
    where: { code },
    update: { name, level, parentId },
    create: { code, name, level, parentId },
  });
}

async function rebuildClosure() {
  await prisma.$executeRawUnsafe(`TRUNCATE TABLE "RegionClosure" RESTART IDENTITY`);
  const regions = await prisma.region.findMany({ select: { id: true, parentId: true } });

  // self-links
  if (regions.length) {
    await prisma.regionClosure.createMany({
      data: regions.map((r) => ({ ancestorId: r.id, descendantId: r.id, depth: 0 })),
      skipDuplicates: true,
    });
  }

  // ancestor chains
  const byId = new Map(regions.map((r) => [r.id, r]));
  for (const r of regions) {
    let cursor = r.parentId;
    let depth = 1;
    while (cursor) {
      await prisma.regionClosure.upsert({
        where: { ancestorId_descendantId: { ancestorId: cursor, descendantId: r.id } },
        update: { depth },
        create: { ancestorId: cursor, descendantId: r.id, depth },
      });
      cursor = byId.get(cursor)?.parentId || null;
      depth += 1;
    }
  }
}

async function main() {
  // 1) Regionen
  await upsertRegion("WORLD", "Welt", 0);
  await upsertRegion("EU", "Europäische Union", 1, "WORLD");
  await upsertRegion("DE", "Deutschland", 2, "WORLD");
  await upsertRegion("DE-BE", "Berlin", 3, "DE");
  await upsertRegion("DE-BY", "Bayern", 3, "DE");
  await rebuildClosure();

  // 2) Topics
  const tDemokratie = await prisma.topic.upsert({
    where: { slug: "demokratie-wahlen" },
    update: {},
    create: { slug: "demokratie-wahlen", title: "Demokratie & Wahlen", locale: "de" },
  });

  const tKlima = await prisma.topic.upsert({
    where: { slug: "klima-energie" },
    update: {},
    create: { slug: "klima-energie", title: "Klima & Energie", locale: "de" },
  });

  // 3) Items
  // Sonntagsfrage (Draft)
  await prisma.contentItem.create({
    data: {
      kind: ContentKind.SUNDAY_POLL,
      topicId: tDemokratie.id,
      text: "Welche Partei würdest Du wählen, wenn am Sonntag Bundestagswahl wäre?",
      locale: "de",
      regionMode: RegionMode.AUTO,
      status: PublishStatus.draft,
      answerOptions: {
        create: [
          { label: "CDU/CSU", value: "CDU/CSU", order: 0 },
          { label: "SPD", value: "SPD", order: 1 },
          { label: "Grüne", value: "GRUENE", order: 2 },
          { label: "FDP", value: "FDP", order: 3 },
          { label: "Linke", value: "LINKE", order: 4 },
          { label: "AfD", value: "AFD", order: 5 },
          { label: "BSW", value: "BSW", order: 6 },
          { label: "Andere", value: "OTHER", order: 7 }
        ],
      },
    },
  });

  // Event (Berlin) – published & terminiert
  const berlin = await prisma.region.findUnique({ where: { code: "DE-BE" } });
  await prisma.contentItem.create({
    data: {
      kind: ContentKind.EVENT,
      topicId: tDemokratie.id,
      text: "Nimmst Du am Rathaus‑Forum in Berlin teil?",
      locale: "de",
      regionMode: RegionMode.MANUAL,
      regionManualId: berlin?.id || null,
      publishAt: new Date(),
      expireAt: new Date(Date.now() + 7 * 24 * 3600 * 1000),
      status: PublishStatus.published,
      answerOptions: {
        create: [
          { label: "Ich komme vor Ort", value: "attend_offline", exclusive: true, order: 0 },
          { label: "Ich schaue den Stream", value: "attend_online", exclusive: true, order: 1 },
          { label: "Ich nehme nicht teil", value: "no", exclusive: true, order: 2 }
        ],
      },
    },
  });

  // Swipe (Draft)
  await prisma.contentItem.create({
    data: {
      kind: ContentKind.SWIPE,
      topicId: tKlima.id,
      text: "Soll das Wahlalter auf 16 Jahre gesenkt werden?",
      locale: "de",
      regionMode: RegionMode.AUTO,
      status: PublishStatus.draft,
    },
  });

  // Tags
  await prisma.tag.createMany({
    data: [
      { slug: "politik", label: "Politik" },
      { slug: "wahl", label: "Wahl" },
      { slug: "event", label: "Event" }
    ],
    skipDuplicates: true,
  });

  // 4) B2C Plans
  const planDefinitions = [
    {
      slug: "basic",
      name: "Basic",
      type: PlanType.B2C,
      monthlyPriceCents: parsePriceCents(process.env.PLAN_BASIC_PRICE_CENTS, 0),
      features: {
        tier: "citizenBasic",
        notes: "Kostenloser Plan, Registrierung erforderlich",
      },
    },
    {
      slug: "pro",
      name: "Pro",
      type: PlanType.B2C,
      monthlyPriceCents: parsePriceCents(process.env.PLAN_PRO_PRICE_CENTS, 990),
      features: {
        tier: "citizenPro",
        perks: ["Stream-Hosting", "Erhöhte Limits"],
      },
    },
    {
      slug: "premium",
      name: "Premium",
      type: PlanType.B2C,
      monthlyPriceCents: parsePriceCents(process.env.PLAN_PREMIUM_PRICE_CENTS, 1990),
      features: {
        tier: "citizenUltra",
        perks: ["Kampagnen", "Höhere Limits"],
      },
    },
  ];

  for (const plan of planDefinitions) {
    await prisma.plan.upsert({
      where: { slug: plan.slug },
      update: {
        name: plan.name,
        type: plan.type,
        monthlyPriceCents: plan.monthlyPriceCents,
        features: plan.features,
      },
      create: plan,
    });
  }

  console.log("✅ Seed done.");
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(async () => { await prisma.$disconnect(); });
