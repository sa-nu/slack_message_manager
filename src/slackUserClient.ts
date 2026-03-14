import { WebClient } from "@slack/web-api";

let client: WebClient;

export function initUserClient(userToken: string) {
  client = new WebClient(userToken);
}

export async function markAsRead(
  channel: string,
  ts: string
): Promise<void> {
  try {
    await client.conversations.mark({ channel, ts });
    console.log(`既読化成功: channel=${channel}, ts=${ts}`);
  } catch (error: any) {
    const code = error?.data?.error || "unknown";
    if (code === "not_in_channel") return;
    console.error(`既読化に失敗: channel=${channel}, ts=${ts} Error: ${code}`);
  }
}

export async function saveMessage(
  channel: string,
  ts: string
): Promise<void> {
  try {
    const result = await client.stars.add({ channel, timestamp: ts });
    console.log(`後で追加成功: channel=${channel}, ts=${ts}, ok=${result.ok}`);
  } catch (error: any) {
    const code = error?.data?.error || "unknown";
    if (code === "already_starred") {
      console.log(`後で追加済み（スキップ）: channel=${channel}, ts=${ts}`);
      return;
    }
    console.error(`後で追加に失敗: channel=${channel}, ts=${ts} Error: ${code}`);
  }
}
