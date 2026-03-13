import "dotenv/config";
import { App, LogLevel } from "@slack/bolt";
import { VercelReceiver, createHandler } from "@vercel/slack-bolt";
import { validateEnv } from "../../src/config.js";
import { initUserContext } from "../../src/userContext.js";
import { initUserClient } from "../../src/slackUserClient.js";
import { createMessageHandler } from "../../src/messageHandler.js";

const config = validateEnv();

const receiver = new VercelReceiver({
  signingSecret: config.signingSecret,
});

const app = new App({
  token: config.botToken,
  receiver,
  deferInitialization: true,
  logLevel: LogLevel.INFO,
});

// UserContextをキャッシュ（サーバーレスのコールドスタート間で再利用）
let userContextPromise: ReturnType<typeof initUserContext> | null = null;

function getUserContext() {
  if (!userContextPromise) {
    userContextPromise = initUserContext(config.userToken);
  }
  return userContextPromise;
}

// ユーザートークンクライアントを初期化
initUserClient(config.userToken);

app.event("message", async (args) => {
  const userContext = await getUserContext();
  const handler = createMessageHandler(userContext);
  await handler(args as any);
});

const boltHandler = createHandler(app, receiver);

// Slack URL verification challenge にも対応
export const POST = async (req: Request) => {
  // challenge リクエストを先に処理
  try {
    const cloned = req.clone();
    const body = await cloned.json();
    if (body.type === "url_verification" && body.challenge) {
      return new Response(JSON.stringify({ challenge: body.challenge }), {
        status: 200,
        headers: { "content-type": "application/json" },
      });
    }
  } catch {
    // JSONパース失敗時はBoltに任せる
  }

  return boltHandler(req);
};
