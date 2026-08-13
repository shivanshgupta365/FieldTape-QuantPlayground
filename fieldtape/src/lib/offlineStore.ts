import Dexie, { type EntityTable } from "dexie";

export type ProgressRecord = {
  moduleId: string;
  completed: boolean;
  bestScore: number;
  updatedAt: string;
};

export type NotebookRecord = {
  id: string;
  title: string;
  hypothesis: string;
  parameters: Record<string, number | string | boolean>;
  result?: string;
  updatedAt: string;
};

class AlpsteadDatabase extends Dexie {
  progress!: EntityTable<ProgressRecord, "moduleId">;
  notebooks!: EntityTable<NotebookRecord, "id">;

  constructor() {
    super("alpstead-local");
    this.version(1).stores({
      progress: "&moduleId, completed, updatedAt",
      notebooks: "&id, updatedAt",
    });
  }
}

export const offlineDb = new AlpsteadDatabase();

