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
    if (error?.data?.error === "not_in_channel") {
      // チャンネル未参加の場合は無視
      return;
    }
    console.error(`既読化に失敗: channel=${channel}, ts=${ts}`, error);
  }
}

export async function saveMessage(
  channel: string,
  ts: string
): Promise<void> {
  try {
    await client.stars.add({ channel, timestamp: ts });
  } catch (error: any) {
    if (error?.data?.error === "already_starred") {
      // 既に保存済みの場合は無視（冪等）
      return;
    }
    console.error(`保存に失敗: channel=${channel}, ts=${ts}`, error);
  }
}
