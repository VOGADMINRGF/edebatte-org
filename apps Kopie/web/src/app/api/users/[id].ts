// apps/web/src/app/api/users/[id].ts
import { dbConnect } from "@/lib/db";
import UserProfile from "@features/user/models/UserProfile";

export default async function handler(req: any, res: any) {
  await dbConnect();
  const { id } = req.query;
  if (!id) return res.status(400).json({ error: "Missing user ID." });

  try {
    switch (req.method) {
      case "GET": {
        const user = await UserProfile.findById(id).select(
          "-mfaSecret -mfaBackupCodes",
        );
        if (!user) return res.status(404).json({ error: "User not found." });
        return res.status(200).json({ user });
      }

      case "PATCH": {
        const data = req.body;
        const updated = await UserProfile.findByIdAndUpdate(id, data, {
          new: true,
        }).select("-mfaSecret -mfaBackupCodes");
        if (!updated) return res.status(404).json({ error: "User not found." });
        return res.status(200).json({ user: updated });
      }

      case "DELETE": {
        await UserProfile.findByIdAndDelete(id);
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
