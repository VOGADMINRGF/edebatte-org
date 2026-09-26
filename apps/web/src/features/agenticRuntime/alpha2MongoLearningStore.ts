import type { Model } from "mongoose";
import { mongo, mongoose } from "@core/db/mongoose";
import {
  Alpha2EvalRecordSchema,
  type Alpha2EvalRecord,
} from "@/features/agenticRuntime/alpha2EvalContract";
import {
  Alpha2LessonSchema,
  type Alpha2Lesson,
} from "@/features/agenticRuntime/alpha2LearningContract";
import type { Alpha2LearningStore } from "@/features/agenticRuntime/alpha2LearningStoreContract";

const EVAL_MODEL = "Alpha2Eval";
const LESSON_MODEL = "Alpha2Lesson";

const Alpha2EvalSchema = new mongoose.Schema(
  {
    evalId: { type: String, required: true, unique: true, index: true },
    runId: { type: String, required: true, index: true },
    taskId: { type: String, required: true, index: true },
    capability: { type: String, required: true, index: true },
    providerId: { type: String, required: true, index: true },
    roleId: { type: String, required: true, index: true },
    createdAtSource: { type: Date, required: true, index: true },
    payload: { type: mongoose.Schema.Types.Mixed, required: true },
  },
  {
    collection: "alpha2_evals",
    timestamps: true,
    minimize: false,
    versionKey: false,
  },
);
Alpha2EvalSchema.index({ capability: 1, providerId: 1, createdAtSource: -1 });
Alpha2EvalSchema.index({ taskId: 1, createdAtSource: -1 });

const Alpha2LessonMongoSchema = new mongoose.Schema(
  {
    lessonId: { type: String, required: true, unique: true, index: true },
    kind: { type: String, required: true, index: true },
    status: { type: String, required: true, index: true },
    scopeKeys: { type: [String], required: true, index: true },
    confidence: { type: Number, required: true, index: true },
    updatedAtSource: { type: Date, required: true, index: true },
    payload: { type: mongoose.Schema.Types.Mixed, required: true },
  },
  {
    collection: "alpha2_lessons",
    timestamps: true,
    minimize: false,
    versionKey: false,
  },
);
Alpha2LessonMongoSchema.index({ status: 1, scopeKeys: 1, confidence: -1 });

async function evalModel(): Promise<Model<any>> {
  await mongo();
  const existing = mongoose.models[EVAL_MODEL] as Model<any> | undefined;
  return existing ?? mongoose.model<any>(EVAL_MODEL, Alpha2EvalSchema);
}

async function lessonModel(): Promise<Model<any>> {
  await mongo();
  const existing = mongoose.models[LESSON_MODEL] as Model<any> | undefined;
  return existing ?? mongoose.model<any>(LESSON_MODEL, Alpha2LessonMongoSchema);
}

function evalFromDoc(doc: any): Alpha2EvalRecord {
  const plain = typeof doc?.toObject === "function" ? doc.toObject() : doc;
  return Alpha2EvalRecordSchema.parse(plain.payload);
}

function lessonFromDoc(doc: any): Alpha2Lesson {
  const plain = typeof doc?.toObject === "function" ? doc.toObject() : doc;
  return Alpha2LessonSchema.parse(plain.payload);
}

export class Alpha2MongoLearningStore implements Alpha2LearningStore {
  async recordEval(record: Alpha2EvalRecord) {
    const parsed = Alpha2EvalRecordSchema.parse(record);
    const Model = await evalModel();
    const existing = await Model.findOne({ evalId: parsed.evalId });
    if (existing) return { created: false, record: evalFromDoc(existing) };

    try {
      const created = await Model.create({
        evalId: parsed.evalId,
        runId: parsed.runId,
        taskId: parsed.taskId,
        capability: parsed.capability,
        providerId: parsed.providerId,
        roleId: parsed.roleId,
        createdAtSource: new Date(parsed.createdAt),
        payload: parsed,
      });
      return { created: true, record: evalFromDoc(created) };
    } catch (error: any) {
      if (error?.code !== 11000) throw error;
      const raced = await Model.findOne({ evalId: parsed.evalId });
      if (!raced) throw error;
      return { created: false, record: evalFromDoc(raced) };
    }
  }

  async listEvals(input: { capability?: string; taskId?: string; limit?: number }) {
    const Model = await evalModel();
    const filter: Record<string, string> = {};
    if (input.capability) filter.capability = input.capability;
    if (input.taskId) filter.taskId = input.taskId;
    const limit = Math.max(1, Math.min(input.limit ?? 500, 5_000));
    const docs = await Model.find(filter).sort({ createdAtSource: -1 }).limit(limit);
    return docs.map(evalFromDoc);
  }

  async createLesson(lesson: Alpha2Lesson) {
    const parsed = Alpha2LessonSchema.parse(lesson);
    const Model = await lessonModel();
    const existing = await Model.findOne({ lessonId: parsed.lessonId });
    if (existing) return { created: false, lesson: lessonFromDoc(existing) };

    try {
      const created = await Model.create({
        lessonId: parsed.lessonId,
        kind: parsed.kind,
        status: parsed.status,
        scopeKeys: parsed.scopeKeys,
        confidence: parsed.confidence,
        updatedAtSource: new Date(parsed.updatedAt),
        payload: parsed,
      });
      return { created: true, lesson: lessonFromDoc(created) };
    } catch (error: any) {
      if (error?.code !== 11000) throw error;
      const raced = await Model.findOne({ lessonId: parsed.lessonId });
      if (!raced) throw error;
      return { created: false, lesson: lessonFromDoc(raced) };
    }
  }

  async updateLesson(input: {
    lesson: Alpha2Lesson;
    expectedStatus: Alpha2Lesson["status"];
  }) {
    const lesson = Alpha2LessonSchema.parse(input.lesson);
    const Model = await lessonModel();
    const updated = await Model.findOneAndUpdate(
      { lessonId: lesson.lessonId, status: input.expectedStatus },
      {
        $set: {
          kind: lesson.kind,
          status: lesson.status,
          scopeKeys: lesson.scopeKeys,
          confidence: lesson.confidence,
          updatedAtSource: new Date(lesson.updatedAt),
          payload: lesson,
        },
      },
      { new: true, runValidators: true },
    );
    if (!updated) throw new Error("alpha2_lesson_status_conflict");
    return lessonFromDoc(updated);
  }

  async getLesson(lessonId: string) {
    const Model = await lessonModel();
    const doc = await Model.findOne({ lessonId });
    return doc ? lessonFromDoc(doc) : null;
  }

  async listAcceptedLessons(input: { scopeKeys?: readonly string[]; limit?: number }) {
    const Model = await lessonModel();
    const filter: Record<string, unknown> = { status: "accepted" };
    if (input.scopeKeys && input.scopeKeys.length > 0) {
      filter.scopeKeys = { $in: [...input.scopeKeys] };
    }
    const limit = Math.max(1, Math.min(input.limit ?? 100, 1_000));
    const docs = await Model.find(filter)
      .sort({ confidence: -1, updatedAtSource: -1 })
      .limit(limit);
    return docs.map(lessonFromDoc);
  }
}

let sharedStore: Alpha2MongoLearningStore | null = null;

export function getAlpha2MongoLearningStore() {
  return (sharedStore ??= new Alpha2MongoLearningStore());
}
