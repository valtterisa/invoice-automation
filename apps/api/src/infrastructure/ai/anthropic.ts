import Anthropic from "@anthropic-ai/sdk";
import { getConfig } from "../../shared/config/index.js";

let client: Anthropic | undefined;

export function getAnthropicClient(): Anthropic {
  if (!client) {
    const apiKey = getConfig().ANTHROPIC_API_KEY;
    client = new Anthropic({ apiKey: apiKey || "missing-key" });
  }
  return client;
}

export function resetAnthropicClient(): void {
  client = undefined;
}

export type AnthropicMessageCreate = Anthropic["messages"]["create"];
