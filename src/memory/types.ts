export interface MemoryEntry {
  readonly id: number;
  readonly category: "project" | "people" | "glossary";
  readonly key: string;
  readonly value: string;
  readonly updatedAt: string; // ISO 8601
}

export type MemoryCategory = MemoryEntry["category"];
