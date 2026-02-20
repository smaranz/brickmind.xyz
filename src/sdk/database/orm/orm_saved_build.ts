import { supabaseRest } from "@/lib/supabase-rest";
import { getStoredUserId } from "@/lib/supabase-auth";

export enum SavedBuildDifficultyLevel {
  Unspecified = 0,
  Easy = 1,
  Medium = 2,
  Hard = 3,
}

export interface SavedBuildModel {
  id: string;
  data_creator: string;
  data_updater: string;
  create_time: string;
  update_time: string;
  user_id: string;
  title: string;
  description?: string | null;
  difficulty_level: SavedBuildDifficultyLevel;
  brick_count: number;
  image_url?: string | null;
}

interface SavedBuildRow {
  id: string;
  user_id: string;
  title: string;
  description: string | null;
  difficulty_level: number;
  brick_count: number;
  image_url: string | null;
  created_at: string;
  updated_at: string;
}

function toUnixSecondsString(value: string | undefined): string {
  if (!value) {
    return Math.floor(Date.now() / 1000).toString();
  }

  const ms = Date.parse(value);
  if (Number.isNaN(ms)) {
    return Math.floor(Date.now() / 1000).toString();
  }

  return Math.floor(ms / 1000).toString();
}

function toModel(row: SavedBuildRow): SavedBuildModel {
  return {
    id: row.id,
    data_creator: "",
    data_updater: "",
    create_time: toUnixSecondsString(row.created_at),
    update_time: toUnixSecondsString(row.updated_at),
    user_id: row.user_id,
    title: row.title,
    description: row.description,
    difficulty_level: row.difficulty_level as SavedBuildDifficultyLevel,
    brick_count: row.brick_count,
    image_url: row.image_url,
  };
}

export class SavedBuildORM {
  private static instance: SavedBuildORM | null = null;

  public static getInstance(): SavedBuildORM {
    if (!SavedBuildORM.instance) {
      SavedBuildORM.instance = new SavedBuildORM();
    }

    return SavedBuildORM.instance;
  }

  async getAllSavedBuild(): Promise<SavedBuildModel[]> {
    const userId = getStoredUserId();
    const query = new URLSearchParams({
      select: "*",
      order: "created_at.desc",
    });
    if (userId) {
      query.set("user_id", `eq.${userId}`);
    }

    const rows = await supabaseRest<SavedBuildRow[]>("saved_build", { query });
    return rows.map(toModel);
  }

  async getSavedBuildByUserId(user_id: string): Promise<SavedBuildModel[]> {
    const query = new URLSearchParams({
      select: "*",
      user_id: `eq.${user_id}`,
      order: "created_at.desc",
    });

    const rows = await supabaseRest<SavedBuildRow[]>("saved_build", { query });
    return rows.map(toModel);
  }

  async insertSavedBuild(data: SavedBuildModel[]): Promise<SavedBuildModel[]> {
    if (data.length === 0) {
      return [];
    }

    const fallbackUserId = getStoredUserId() || "current-user";
    const payload = data.map((item) => ({
      user_id: item.user_id || fallbackUserId,
      title: item.title || "Untitled Build",
      description: item.description ?? null,
      difficulty_level:
        item.difficulty_level ?? SavedBuildDifficultyLevel.Unspecified,
      brick_count: Number.isFinite(item.brick_count) ? item.brick_count : 0,
      image_url: item.image_url ?? null,
    }));

    const query = new URLSearchParams({ select: "*" });
    const rows = await supabaseRest<SavedBuildRow[]>("saved_build", {
      method: "POST",
      query,
      body: payload,
      prefer: "return=representation",
    });

    return rows.map(toModel);
  }
}

export default SavedBuildORM;
