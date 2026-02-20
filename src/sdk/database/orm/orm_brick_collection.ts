import { supabaseRest } from "@/lib/supabase-rest";
import { getStoredUserId } from "@/lib/supabase-auth";

export interface BrickCollectionModel {
  id: string;
  data_creator: string;
  data_updater: string;
  create_time: string;
  update_time: string;
  user_id: string;
  brick_type: string;
  color: string;
  quantity: number;
}

interface BrickCollectionRow {
  id: string;
  user_id: string;
  brick_type: string;
  color: string;
  quantity: number;
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

function toModel(row: BrickCollectionRow): BrickCollectionModel {
  return {
    id: row.id,
    data_creator: "",
    data_updater: "",
    create_time: toUnixSecondsString(row.created_at),
    update_time: toUnixSecondsString(row.updated_at),
    user_id: row.user_id,
    brick_type: row.brick_type,
    color: row.color,
    quantity: row.quantity,
  };
}

export class BrickCollectionORM {
  private static instance: BrickCollectionORM | null = null;

  public static getInstance(): BrickCollectionORM {
    if (!BrickCollectionORM.instance) {
      BrickCollectionORM.instance = new BrickCollectionORM();
    }

    return BrickCollectionORM.instance;
  }

  async getAllBrickCollection(): Promise<BrickCollectionModel[]> {
    const userId = getStoredUserId();
    const query = new URLSearchParams({
      select: "*",
      order: "created_at.desc",
    });
    if (userId) {
      query.set("user_id", `eq.${userId}`);
    }

    const rows = await supabaseRest<BrickCollectionRow[]>("brick_collection", {
      query,
    });

    return rows.map(toModel);
  }

  async getBrickCollectionByUserId(user_id: string): Promise<BrickCollectionModel[]> {
    const query = new URLSearchParams({
      select: "*",
      user_id: `eq.${user_id}`,
      order: "created_at.desc",
    });

    const rows = await supabaseRest<BrickCollectionRow[]>("brick_collection", {
      query,
    });

    return rows.map(toModel);
  }

  async insertBrickCollection(
    data: BrickCollectionModel[],
  ): Promise<BrickCollectionModel[]> {
    if (data.length === 0) {
      return [];
    }

    const fallbackUserId = getStoredUserId() || "current-user";
    const payload = data.map((item) => ({
      user_id: item.user_id || fallbackUserId,
      brick_type: item.brick_type || "",
      color: item.color || "",
      quantity: Number.isFinite(item.quantity) ? item.quantity : 0,
    }));

    const query = new URLSearchParams({ select: "*" });
    const rows = await supabaseRest<BrickCollectionRow[]>("brick_collection", {
      method: "POST",
      query,
      body: payload,
      prefer: "return=representation",
    });

    return rows.map(toModel);
  }
}

export default BrickCollectionORM;
