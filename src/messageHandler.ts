import type { UserContext } from "./types.js";
import { isMentioned } from "./mentionDetector.js";
import { markAsRead, saveMessage } from "./slackUserClient.js";

interface MessageEvent {
  channel: string;
  ts: string;
  text?: string;
  user?: string;
  subtype?: string;
  bot_id?: string;
}

const SKIP_SUBTYPES = new Set([
  "bot_message",
  "message_changed",
  "message_deleted",
  "channel_join",
  "channel_leave",
  "channel_topic",
  "channel_purpose",
  "channel_name",
  "channel_archive",
  "channel_unarchive",
  "group_join",
  "group_leave",
  "group_topic",
  "group_purpose",
  "group_name",
  "group_archive",
  "group_unarchive",
]);

export function createMessageHandler(userContext: UserContext) {
  return async ({ message }: { message: MessageEvent }) => {
    // サブタイプがスキップ対象ならスキップ
    if (message.subtype && SKIP_SUBTYPES.has(message.subtype)) {
      return;
    }

    // ボットメッセージはスキップ
    if (message.bot_id) {
      return;
    }

    const { channel, ts, text, user: userId } = message;

    // 自分自身のメッセージはスキップ
    if (userId === userContext.userId) {
      return;
    }

    const result = isMentioned(text || "", userContext);

    if (result.isMentioned) {
      console.log(
        `メンション検出 [${result.reason}]: channel=${channel}, ts=${ts}`
      );
      await saveMessage(channel, ts);
    } else {
      await markAsRead(channel, ts);
    }
  };
}
