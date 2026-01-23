import { getVoteStats } from "@/lib/vote/stats";
import { VoteModel } from "@/models/Vote";
import mongoose from "mongoose";
import { mongo } from "@core/mongoose";

describe("vote stats", () => {
  beforeAll(async () => {
    await mongo();
    const Vote = await VoteModel();
    await Vote.deleteMany({});
    const sid = new mongoose.Types.ObjectId();
    const uid = new mongoose.Types.ObjectId();
    await Vote.create([
      { userId: uid, statementId: sid, choice: "agree", day: new Date(), region: { country: "DE" } },
      { userId: new mongoose.Types.ObjectId(), statementId: sid, choice: "neutral", day: new Date(), region: { country: "DE" } },
      { userId: new mongoose.Types.ObjectId(), statementId: sid, choice: "disagree", day: new Date(), region: { country: "FR" } }
    ]);
    (global as any)._sid = sid.toString();
  });
  afterAll(async () => { await mongoose.connection.close(); });

  it("calculates totals and byCountry", async () => {
    const stats = await getVoteStats((global as any)._sid);
    expect(stats.totals.total).toBe(3);
    expect(stats.byCountry.find(r => r.country==="DE")?.total).toBe(2);
  });
});
