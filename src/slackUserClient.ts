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
    await client.stars.add({ channel, timestamp: ts });
    console.log(`保存成功: channel=${channel}, ts=${ts}`);
  } catch (error: any) {
    const code = error?.data?.error || "unknown";
    if (code === "already_starred") {
      console.log(`保存済み（スキップ）: channel=${channel}, ts=${ts}`);
      return;
    }
    console.error(`保存に失敗: channel=${channel}, ts=${ts} Error: ${code}`);
  }
}
