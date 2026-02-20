import { supabaseRest } from "@/lib/supabase-rest";
import { getStoredUserId } from "@/lib/supabase-auth";

export interface ScanHistoryModel {
  id: string;
  data_creator: string;
  data_updater: string;
  create_time: string;
  update_time: string;
  user_id: string;
  image_url?: string | null;
  detected_bricks?: string | null;
}

interface ScanHistoryRow {
  id: string;
  user_id: string;
  image_url: string | null;
  detected_bricks: string | null;
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

function toModel(row: ScanHistoryRow): ScanHistoryModel {
  return {
    id: row.id,
    data_creator: "",
    data_updater: "",
    create_time: toUnixSecondsString(row.created_at),
    update_time: toUnixSecondsString(row.updated_at),
    user_id: row.user_id,
    image_url: row.image_url,
    detected_bricks: row.detected_bricks,
  };
}

export class ScanHistoryORM {
  private static instance: ScanHistoryORM | null = null;

  public static getInstance(): ScanHistoryORM {
    if (!ScanHistoryORM.instance) {
      ScanHistoryORM.instance = new ScanHistoryORM();
    }

    return ScanHistoryORM.instance;
  }

  async getAllScanHistory(): Promise<ScanHistoryModel[]> {
    const userId = getStoredUserId();
    const query = new URLSearchParams({
      select: "*",
      order: "created_at.desc",
    });
    if (userId) {
      query.set("user_id", `eq.${userId}`);
    }

    const rows = await supabaseRest<ScanHistoryRow[]>("scan_history", { query });
    return rows.map(toModel);
  }

  async getScanHistoryByUserId(user_id: string): Promise<ScanHistoryModel[]> {
    const query = new URLSearchParams({
      select: "*",
      user_id: `eq.${user_id}`,
      order: "created_at.desc",
    });

    const rows = await supabaseRest<ScanHistoryRow[]>("scan_history", { query });
    return rows.map(toModel);
  }

  async insertScanHistory(data: ScanHistoryModel[]): Promise<ScanHistoryModel[]> {
    if (data.length === 0) {
      return [];
    }

    const fallbackUserId = getStoredUserId() || "current-user";
    const payload = data.map((item) => ({
      user_id: item.user_id || fallbackUserId,
      image_url: item.image_url ?? null,
      detected_bricks: item.detected_bricks ?? null,
    }));

    const query = new URLSearchParams({ select: "*" });
    const rows = await supabaseRest<ScanHistoryRow[]>("scan_history", {
      method: "POST",
      query,
      body: payload,
      prefer: "return=representation",
    });

    return rows.map(toModel);
  }
}

export default ScanHistoryORM;
