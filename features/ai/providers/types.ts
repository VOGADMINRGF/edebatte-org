export type AskArgs = {
  prompt: string;
  asJson?: boolean;
  system?: string;
  model?: string;
};

export type AskFn = (args: AskArgs) => Promise<{ text: string }>;
export type Provider = { ask: AskFn };
