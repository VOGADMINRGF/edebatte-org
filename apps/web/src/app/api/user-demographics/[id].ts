// apps/web/src/app/api/user-demographics/[id].ts
import { dbConnect } from "@/lib/db";
import UserDemographics from "@/models/pii/UserDemographics";

export default async function handler(req: any, res: any) {
  await dbConnect();
  const { id } = req.query; // userId
  if (!id) return res.status(400).json({ error: "Missing user ID." });

  try {
    switch (req.method) {
      case "GET": {
        const demographics = await UserDemographics.findOne({ userId: id });
        if (!demographics)
          return res
            .status(404)
            .json({ error: "No demographic data found for this user." });
        return res.status(200).json({ demographics });
      }

      case "PATCH": {
        const data = req.body;
        const updated = await UserDemographics.findOneAndUpdate(
          { userId: id },
          data,
          { new: true, upsert: true },
        );
        return res.status(200).json({ demographics: updated });
      }

      case "DELETE": {
        await UserDemographics.deleteOne({ userId: id });
        return res.status(204).end();
      }

      default: {
        res.setHeader("Allow", ["GET", "PATCH", "DELETE"]);
        return res
          .status(405)
          .json({ error: `Method ${req.method} not allowed.` });
      }
    }
  } catch (err: any) {
    return res
      .status(500)
      .json({ error: "Database error.", details: err.message });
  }
}
