import "dotenv/config";
import { WebClient } from "@slack/web-api";

const userClient = new WebClient(process.env.SLACK_USER_TOKEN);

async function main() {
  const auth = await userClient.auth.test();
  console.log(`認証ユーザー: ${auth.user_id} (${auth.user})`);

  const channel = "C01HP7X9HRA";

  // 最新メッセージを取得
  const history = await userClient.conversations.history({
    channel,
    limit: 3,
  });

  const msg = history.messages?.[0];
  if (!msg?.ts) {
    console.log("メッセージが見つかりません");
    return;
  }
  console.log(`対象メッセージ: ts=${msg.ts}, text=${msg.text?.substring(0, 50)}`);

  // パーマリンク取得
  const link = await userClient.chat.getPermalink({
    channel,
    message_ts: msg.ts,
  });
  console.log(`パーマリンク: ${link.permalink}`);

  // reminders.add で「後で」に追加
  console.log(`\nreminders.add を実行...`);
  try {
    const result = await userClient.reminders.add({
      text: link.permalink!,
      time: "in 1 second",
    });
    console.log("結果:", JSON.stringify(result, null, 2));
  } catch (e: any) {
    console.log("エラー:", e?.data?.error);
  }

  console.log("\nSlackの「後で」を確認してください。");
}

main().catch(console.error);
