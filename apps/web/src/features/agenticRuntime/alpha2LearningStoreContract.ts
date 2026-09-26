import type { Alpha2EvalRecord } from "@/features/agenticRuntime/alpha2EvalContract";
import type {
  Alpha2Lesson,
  Alpha2LessonStatus,
} from "@/features/agenticRuntime/alpha2LearningContract";

export interface Alpha2LearningStore {
  recordEval(record: Alpha2EvalRecord): Promise<{ created: boolean; record: Alpha2EvalRecord }>;
  listEvals(input: {
    capability?: string;
    taskId?: string;
    limit?: number;
  }): Promise<Alpha2EvalRecord[]>;
  createLesson(lesson: Alpha2Lesson): Promise<{ created: boolean; lesson: Alpha2Lesson }>;
  updateLesson(input: {
    lesson: Alpha2Lesson;
    expectedStatus: Alpha2LessonStatus;
  }): Promise<Alpha2Lesson>;
  getLesson(lessonId: string): Promise<Alpha2Lesson | null>;
  listAcceptedLessons(input: {
    scopeKeys?: readonly string[];
    limit?: number;
  }): Promise<Alpha2Lesson[]>;
}
