import { coreCol } from "@core/db/triMongo";
import type { Collection, Filter, UpdateFilter, FindOptions, WithId } from "mongodb";

export type ErrorLogDoc = {
  _id?: any;
  level?: "info" | "warn" | "error";
  message: string;
  ctx?: any;
  timestamp?: Date;
  createdAt?: Date;
  resolved?: boolean;
  path?: string;
  traceId?: string;
  [k: string]: any;
};

async function col(): Promise<Collection<ErrorLogDoc>> {
  return coreCol<ErrorLogDoc>("error_logs");
}

export const ErrorLogModel = {
  async collection(){ return await col(); },

  async find(filter: any = {}, options?: FindOptions<ErrorLogDoc>): Promise<WithId<ErrorLogDoc>[]> {
    const c = await col();
    return c.find(filter as any, options as any).toArray();
  },

  async insertOne(doc: ErrorLogDoc) {
    const c = await col();
    const now = new Date();
    return c.insertOne({ timestamp: now, createdAt: now, ...doc } as any);
  },

  async create(doc: ErrorLogDoc){ return this.insertOne(doc); },

  async countDocuments(filter: any = {}) {
    const c = await col();
    return c.countDocuments(filter as any);
  },

  async updateOne(filter: any, update: any, options?: any) {
    const c = await col();
    return c.updateOne(filter as any, update as any, options);
  },

  async deleteOne(filter: any) {
    const c = await col();
    return c.deleteOne(filter as any);
  },

  async findOneAndUpdate(filter: any, update: any, options: any = {}) {
    const c = await col();
    const res = await c.findOneAndUpdate(filter as any, update as any, { returnDocument: "after", ...options });
    return res.value;
  },

  async list(filter: any = {}, options: any = {}) {
    const c = await col();
    return c.find(filter as any, options as any).sort({ timestamp: -1 }).toArray();
  },
};

export default ErrorLogModel;
