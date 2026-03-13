import type { UserContext, MentionCheckResult } from "./types.js";

export function isMentioned(
  text: string,
  userContext: UserContext
): MentionCheckResult {
  if (!text) {
    return { isMentioned: false };
  }

  // 1. 直接メンション: <@U01ABC123>
  if (text.includes(`<@${userContext.userId}>`)) {
    return { isMentioned: true, reason: "direct_mention" };
  }

  // 2. @channel
  if (text.includes("<!channel>")) {
    return { isMentioned: true, reason: "channel" };
  }

  // 3. @here
  if (text.includes("<!here>")) {
    return { isMentioned: true, reason: "here" };
  }

  // 4. ユーザーグループメンション: <!subteam^SXXXXXXX>
  for (const groupId of userContext.userGroupIds) {
    if (text.includes(`<!subteam^${groupId}>`)) {
      return { isMentioned: true, reason: "usergroup" };
    }
  }

  // 5. 表示名・本名のテキスト内出現（3文字以上の場合のみ）
  if (userContext.displayName.length >= 3) {
    const pattern = new RegExp(`\\b${escapeRegExp(userContext.displayName)}\\b`, "i");
    if (pattern.test(text)) {
      return { isMentioned: true, reason: "display_name" };
    }
  }

  if (
    userContext.realName.length >= 3 &&
    userContext.realName !== userContext.displayName
  ) {
    const pattern = new RegExp(`\\b${escapeRegExp(userContext.realName)}\\b`, "i");
    if (pattern.test(text)) {
      return { isMentioned: true, reason: "real_name" };
    }
  }

  return { isMentioned: false };
}

function escapeRegExp(str: string): string {
  return str.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
