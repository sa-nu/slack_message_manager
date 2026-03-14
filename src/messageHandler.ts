import type { UserContext } from "./types.js";
import { isMentioned } from "./mentionDetector.js";
import { markAsRead } from "./slackUserClient.js";

interface MessageEvent {
  channel: string;
  ts: string;
  thread_ts?: string;
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
    console.log(
      `イベント受信: channel=${message.channel}, ts=${message.ts}, subtype=${message.subtype}, bot_id=${message.bot_id}, user=${message.user}, text=${message.text?.substring(0, 50)}`
    );

    // サブタイプがスキップ対象ならスキップ
    if (message.subtype && SKIP_SUBTYPES.has(message.subtype)) {
      console.log(`スキップ(subtype=${message.subtype})`);
      return;
    }

    // スレッド返信はスキップ（conversations.markでは既読化できないため）
    if (message.thread_ts) {
      console.log(`スキップ(スレッド返信)`);
      return;
    }

    // ボットメッセージはスキップ
    if (message.bot_id) {
      console.log(`スキップ(bot_id=${message.bot_id})`);
      return;
    }

    const { channel, ts, text, user: userId } = message;

    // 自分自身のメッセージはスキップ
    if (userId === userContext.userId) {
      console.log(`スキップ(自分自身)`);
      return;
    }

    const result = isMentioned(text || "", userContext);

    if (result.isMentioned) {
      // メンション対象 → アクティビティに残す（何もしない）
      console.log(
        `メンション検出 [${result.reason}]: channel=${channel}, ts=${ts}`
      );
    } else {
      // メンション対象外 → 既読にしてアクティビティから消す
      console.log(`既読化: channel=${channel}, ts=${ts}`);
      await markAsRead(channel, ts);
    }
  };
}
