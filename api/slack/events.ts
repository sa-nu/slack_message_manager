import "dotenv/config";

// Slack URL verification challenge を最優先で処理
// 環境変数エラーやBolt初期化エラーがあってもchallengeには応答する
export const POST = async (req: Request) => {
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
    // JSONパース失敗時は下のBoltハンドラに任せる
  }

  // challenge以外のイベントはBoltで処理
  try {
    const handler = await getBoltHandler();
    return handler(req);
  } catch (error) {
    console.error("Boltハンドラの初期化に失敗:", error);
    return new Response(
      JSON.stringify({ error: "Internal server error" }),
      { status: 500, headers: { "content-type": "application/json" } }
    );
  }
};

// Bolt関連の初期化を遅延実行（challengeをブロックしないため）
let boltHandlerPromise: Promise<(req: Request) => Promise<Response>> | null =
  null;

function getBoltHandler() {
  if (!boltHandlerPromise) {
    boltHandlerPromise = initBolt();
  }
  return boltHandlerPromise;
}

async function initBolt() {
  const { App, LogLevel } = await import("@slack/bolt");
  const { VercelReceiver, createHandler } = await import("@vercel/slack-bolt");
  const { validateEnv } = await import("../../src/config.js");
  const { initUserContext } = await import("../../src/userContext.js");
  const { initUserClient } = await import("../../src/slackUserClient.js");
  const { createMessageHandler } = await import(
    "../../src/messageHandler.js"
  );

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

  initUserClient(config.userToken);

  let userContextPromise: ReturnType<typeof initUserContext> | null = null;
  function getUserContext() {
    if (!userContextPromise) {
      userContextPromise = initUserContext(config.userToken);
    }
    return userContextPromise;
  }

  app.event("message", async (args) => {
    const userContext = await getUserContext();
    const handler = createMessageHandler(userContext);
    await handler(args as any);
  });

  return createHandler(app, receiver);
}
