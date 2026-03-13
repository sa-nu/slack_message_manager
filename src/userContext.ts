import { WebClient } from "@slack/web-api";
import type { UserContext } from "./types.js";

export async function initUserContext(
  userToken: string
): Promise<UserContext> {
  const client = new WebClient(userToken);

  // ユーザーIDと表示名を並列取得
  const authResult = await client.auth.test();
  const userId = authResult.user_id!;

  const [userInfo, groupsResult] = await Promise.all([
    client.users.info({ user: userId }),
    client.usergroups.list({ include_users: true }).catch(() => null),
  ]);

  const profile = userInfo.user?.profile;
  const displayName = profile?.display_name || "";
  const realName = profile?.real_name || "";

  // include_users: true で各グループのusersが含まれるため、1回で済む
  const userGroupIds: string[] = [];
  if (groupsResult?.usergroups) {
    for (const group of groupsResult.usergroups) {
      if (group.id && group.users?.includes(userId)) {
        userGroupIds.push(group.id);
      }
    }
  }

  // 環境変数からカスタムキーワードを取得（カンマ区切り）
  const keywords = (process.env.SLACK_KEYWORDS || "")
    .split(",")
    .map((k) => k.trim())
    .filter((k) => k.length > 0);

  console.log(
    `UserContext初期化完了: userId=${userId}, displayName=${displayName}, realName=${realName}, userGroups=${userGroupIds.length}件, keywords=${keywords.length}件`
  );

  return { userId, displayName, realName, userGroupIds, keywords };
}
