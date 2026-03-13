import { WebClient } from "@slack/web-api";
import type { UserContext } from "./types.js";

export async function initUserContext(
  userToken: string
): Promise<UserContext> {
  const client = new WebClient(userToken);

  // ユーザーIDを取得
  const authResult = await client.auth.test();
  const userId = authResult.user_id!;

  // 表示名・本名を取得
  const userInfo = await client.users.info({ user: userId });
  const profile = userInfo.user?.profile;
  const displayName = profile?.display_name || "";
  const realName = profile?.real_name || "";

  // 所属ユーザーグループを取得
  const userGroupIds: string[] = [];
  try {
    const groupsResult = await client.usergroups.list();
    const allGroups = groupsResult.usergroups || [];

    for (const group of allGroups) {
      if (!group.id) continue;
      try {
        const membersResult = await client.usergroups.users.list({
          usergroup: group.id,
        });
        if (membersResult.users?.includes(userId)) {
          userGroupIds.push(group.id);
        }
      } catch {
        // グループメンバー取得に失敗した場合はスキップ
      }
    }
  } catch {
    console.warn("ユーザーグループの取得に失敗しました。グループメンション検出は無効になります。");
  }

  console.log(
    `UserContext初期化完了: userId=${userId}, displayName=${displayName}, realName=${realName}, userGroups=${userGroupIds.length}件`
  );

  return { userId, displayName, realName, userGroupIds };
}
