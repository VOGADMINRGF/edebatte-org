// apps/web/src/models/core/ErrorLog.ts
import { Schema, Document } from "mongoose";
import { coreConn } from "@/lib/db/core";
import { modelOn } from "@/lib/db/modelOn";

export interface IErrorLog extends Document {
  traceId: string;
  message?: string;
  code?: string;
  path?: string;
  status?: number;
  timestamp: Date;
  cause?: any;
  payload?: any;
  resolved: boolean;
}

const ErrorLogSchema = new Schema<IErrorLog>(
  {
    traceId: { type: String, required: true, unique: true, trim: true },
    message: { type: String, trim: true },
    code: { type: String, trim: true, index: true },
    path: { type: String, trim: true, index: true },
    status: { type: Number, index: true },
    timestamp: { type: Date, default: Date.now, index: true },
    cause: { type: Schema.Types.Mixed },
    payload: { type: Schema.Types.Mixed },
    resolved: { type: Boolean, default: false, index: true },
  },
  { timestamps: false },
);

ErrorLogSchema.index({ resolved: 1, timestamp: -1 });
export default modelOn<IErrorLog>(
  conn,
  "ErrorLog",
  ErrorLogSchema,
  "error_logs",
);
