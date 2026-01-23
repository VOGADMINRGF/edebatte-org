import { NextResponse } from "next/server";

async function seedPrismaAdjacency() {
  const client = await getPrismaClient();
  if (!client) return null;
  // minimal: 2 Topics + Relation in adjacency table (falls du schon ein Modell hast, passe hier an)
  const t1 = await client.topic.upsert({ where:{ slug:"energie" }, update:{}, create:{ slug:"energie", title:"Energie" }});
  const t2 = await client.topic.upsert({ where:{ slug:"klima" }, update:{}, create:{ slug:"klima", title:"Klima" }});
  // Beispielhafte Relation (TopicRelation: { fromId, toId, kind })
  const topicRelation = (client as any).topicRelation;
  if (topicRelation?.upsert) {
    await topicRelation.upsert({
      where: { fromId_toId_kind: { fromId: t1.id, toId: t2.id, kind: "RELATES" } },
      update: {},
      create: { fromId: t1.id, toId: t2.id, kind: "RELATES" },
    });
  }
  return { ok:true, mode:"prisma", nodes:[t1.id,t2.id] };
}

async function seedNeo4j() {
  const neo4j = await import("neo4j-driver");
  const url = process.env.NEO4J_URI, user = process.env.NEO4J_USER, pass = process.env.NEO4J_PASSWORD;
  if (!url || !user || !pass) return null;
  const driver = neo4j.driver(String(url), neo4j.auth.basic(user, pass));
  const session = driver.session();
  try {
    await session.run("MERGE (:Topic {slug:$s, title:'Energie'})", { s:"energie" });
    await session.run("MERGE (:Topic {slug:$s, title:'Klima'})", { s:"klima" });
    await session.run("MATCH (a:Topic {slug:'energie'}),(b:Topic {slug:'klima'}) MERGE (a)-[:RELATES]->(b)");
    return { ok:true, mode:"neo4j" };
  } finally {
    await session.close(); await driver.close();
  }
}

export async function POST() {
  try {
    const neo = await seedNeo4j();
    if (neo) return NextResponse.json(neo);
    const prismaAdj = await seedPrismaAdjacency();
    return NextResponse.json(prismaAdj);
  } catch (e:any) {
    return NextResponse.json({ ok:false, error: e?.message || String(e) }, { status: 500 });
  }
}

async function getPrismaClient() {
  if (!process.env.WEB_DATABASE_URL) return null;
  const mod = await import("@/lib/prisma");
  return mod.prisma;
}
