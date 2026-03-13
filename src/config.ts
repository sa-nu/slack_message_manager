export function validateEnv() {
  const required = [
    "SLACK_BOT_TOKEN",
    "SLACK_USER_TOKEN",
    "SLACK_SIGNING_SECRET",
  ] as const;

  for (const key of required) {
    if (!process.env[key]) {
      throw new Error(`環境変数 ${key} が設定されていません`);
    }
  }

  return {
    botToken: process.env.SLACK_BOT_TOKEN!,
    userToken: process.env.SLACK_USER_TOKEN!,
    signingSecret: process.env.SLACK_SIGNING_SECRET!,
  };
}
