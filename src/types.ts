export interface UserContext {
  userId: string;
  displayName: string;
  realName: string;
  userGroupIds: string[];
}

export interface MentionCheckResult {
  isMentioned: boolean;
  reason?:
    | "direct_mention"
    | "channel"
    | "here"
    | "usergroup"
    | "display_name"
    | "real_name";
}
