import "dotenv/config";
import { WebClient } from "@slack/web-api";

const TOP_N = 30;

const userClient = new WebClient(process.env.SLACK_USER_TOKEN);
const botClient = new WebClient(process.env.SLACK_BOT_TOKEN);

async function main() {
  const botAuth = await botClient.auth.test();
  const botUserId = botAuth.user_id!;
  console.log(`ボットユーザーID: ${botUserId}`);

  const userAuth = await userClient.auth.test();
  const myUserId = userAuth.user_id!;
  console.log(`自分のユーザーID: ${myUserId}`);

  const oneMonthAgo = new Date();
  oneMonthAgo.setMonth(oneMonthAgo.getMonth() - 1);
  const afterDate = oneMonthAgo.toISOString().split("T")[0];

  console.log(`\n${afterDate} 以降のメンションを検索中...`);

  // チャンネルごとのメンション数をカウント
  const channelMentionCount = new Map<string, number>();

  // 直接メンション検索
  await searchAndCount(
    `<@${myUserId}> after:${afterDate}`,
    channelMentionCount
  );

  // @channel, @here 検索
  for (const keyword of ["@channel", "@here"]) {
    await searchAndCount(
      `${keyword} after:${afterDate}`,
      channelMentionCount
    );
  }

  console.log(`\nメンションが見つかったチャンネル数: ${channelMentionCount.size}`);

  // メンション数の多い順にソートし、トップNを取得
  const sorted = [...channelMentionCount.entries()]
    .sort((a, b) => b[1] - a[1]);

  const topChannels = new Set(
    sorted.slice(0, TOP_N).map(([id]) => id)
  );

  console.log(`\nトップ${TOP_N}チャンネル（メンション数順）:`);
  for (const [id, count] of sorted.slice(0, TOP_N)) {
    console.log(`  ${id}: ${count}件`);
  }

  // --- ボットが現在参加しているチャンネルを取得 ---
  const botChannels = new Set<string>();
  let cursor: string | undefined;
  do {
    const result = await botClient.conversations.list({
      types: "public_channel,private_channel",
      limit: 1000,
      cursor,
    });
    for (const ch of result.channels || []) {
      if (ch.id && ch.is_member) {
        botChannels.add(ch.id);
      }
    }
    cursor = result.response_metadata?.next_cursor || undefined;
  } while (cursor);

  console.log(`\nボットが現在参加中のチャンネル数: ${botChannels.size}`);

  // --- トップNに参加 ---
  let joined = 0;
  let alreadyIn = 0;
  let joinFailed = 0;

  for (const channelId of topChannels) {
    if (botChannels.has(channelId)) {
      alreadyIn++;
      continue;
    }
    try {
      await botClient.conversations.join({ channel: channelId });
      joined++;
      console.log(`  ✓ 参加: ${channelId}`);
    } catch (error: any) {
      const errCode = error?.data?.error;
      console.log(`  - スキップ (${errCode}): ${channelId}`);
      joinFailed++;
    }
  }

  // --- トップN以外から退出 ---
  let left = 0;
  let leaveFailed = 0;

  for (const channelId of botChannels) {
    if (topChannels.has(channelId)) continue;
    try {
      await botClient.conversations.leave({ channel: channelId });
      left++;
      console.log(`  ← 退出: ${channelId}`);
    } catch (error: any) {
      const errCode = error?.data?.error;
      if (errCode === "cant_leave_general") {
        // #general からは退出不可
        continue;
      }
      console.log(`  ✗ 退出失敗 (${errCode}): ${channelId}`);
      leaveFailed++;
    }
  }

  console.log(`\n結果:`);
  console.log(`  新規参加: ${joined}`);
  console.log(`  既に参加済み: ${alreadyIn}`);
  console.log(`  参加スキップ: ${joinFailed}`);
  console.log(`  退出: ${left}`);
  console.log(`  退出失敗: ${leaveFailed}`);
}

async function searchAndCount(
  query: string,
  countMap: Map<string, number>
) {
  let page = 1;
  let fetched = 0;

  while (true) {
    const result = await userClient.search.messages({
      query,
      sort: "timestamp",
      sort_dir: "desc",
      count: 100,
      page,
    });

    const matches = result.messages?.matches || [];
    if (matches.length === 0) break;

    for (const match of matches) {
      const chId = match.channel?.id;
      if (chId) {
        countMap.set(chId, (countMap.get(chId) || 0) + 1);
      }
    }

    fetched += matches.length;
    const total = result.messages?.total || 0;
    if (fetched >= total) break;
    page++;
  }
}

main().catch(console.error);
