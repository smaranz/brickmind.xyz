import { supabaseRest } from "@/lib/supabase-rest";
import { getStoredUserId } from "@/lib/supabase-auth";

export enum ChatMessageRole {
  Unspecified = 0,
  User = 1,
  Assistant = 2,
}

export interface ChatMessageModel {
  id: string;
  data_creator: string;
  data_updater: string;
  create_time: string;
  update_time: string;
  user_id: string;
  session_id: string;
  role: ChatMessageRole;
  text_content: string;
}

interface ChatMessageRow {
  id: string;
  user_id: string;
  session_id: string;
  role: number;
  text_content: string;
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

function toModel(row: ChatMessageRow): ChatMessageModel {
  return {
    id: row.id,
    data_creator: "",
    data_updater: "",
    create_time: toUnixSecondsString(row.created_at),
    update_time: toUnixSecondsString(row.updated_at),
    user_id: row.user_id,
    session_id: row.session_id,
    role: row.role as ChatMessageRole,
    text_content: row.text_content,
  };
}

export class ChatMessageORM {
  private static instance: ChatMessageORM | null = null;

  public static getInstance(): ChatMessageORM {
    if (!ChatMessageORM.instance) {
      ChatMessageORM.instance = new ChatMessageORM();
    }

    return ChatMessageORM.instance;
  }

  async getAllChatMessage(): Promise<ChatMessageModel[]> {
    const userId = getStoredUserId();
    const query = new URLSearchParams({
      select: "*",
      order: "created_at.asc",
    });
    if (userId) {
      query.set("user_id", `eq.${userId}`);
    }

    const rows = await supabaseRest<ChatMessageRow[]>("chat_message", { query });
    return rows.map(toModel);
  }

  async getChatMessageByIDs(ids: string[]): Promise<ChatMessageModel[]> {
    if (ids.length === 0) {
      return [];
    }

    const query = new URLSearchParams({
      select: "*",
      id: `in.(${ids.join(",")})`,
      order: "created_at.asc",
    });
    const userId = getStoredUserId();
    if (userId) {
      query.set("user_id", `eq.${userId}`);
    }

    const rows = await supabaseRest<ChatMessageRow[]>("chat_message", { query });
    return rows.map(toModel);
  }

  async getChatMessageBySessionId(session_id: string): Promise<ChatMessageModel[]> {
    const userId = getStoredUserId();
    const query = new URLSearchParams({
      select: "*",
      session_id: `eq.${session_id}`,
      order: "created_at.asc",
    });
    if (userId) {
      query.set("user_id", `eq.${userId}`);
    }

    const rows = await supabaseRest<ChatMessageRow[]>("chat_message", { query });
    return rows.map(toModel);
  }

  async insertChatMessage(data: ChatMessageModel[]): Promise<ChatMessageModel[]> {
    if (data.length === 0) {
      return [];
    }

    const fallbackUserId = getStoredUserId() || "current-user";
    const payload = data.map((item) => ({
      user_id: item.user_id || fallbackUserId,
      session_id: item.session_id || "default-session",
      role: item.role ?? ChatMessageRole.Unspecified,
      text_content: item.text_content || "",
    }));

    const query = new URLSearchParams({ select: "*" });
    const rows = await supabaseRest<ChatMessageRow[]>("chat_message", {
      method: "POST",
      query,
      body: payload,
      prefer: "return=representation",
    });

    return rows.map(toModel);
  }

  async deleteChatMessageBySessionId(session_id: string): Promise<void> {
    const query = new URLSearchParams({ session_id: `eq.${session_id}` });
    await supabaseRest("chat_message", {
      method: "DELETE",
      query,
      prefer: "return=minimal",
    });
  }

  async purgeAllChatMessage(): Promise<void> {
    const query = new URLSearchParams({ id: "not.is.null" });
    await supabaseRest("chat_message", {
      method: "DELETE",
      query,
      prefer: "return=minimal",
    });
  }
}

export default ChatMessageORM;
