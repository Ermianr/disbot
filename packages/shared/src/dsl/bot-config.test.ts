import { describe, expect, it } from "vitest";
import { BotConfig } from "./bot-config";

describe("BotConfig", () => {
  it("accepts a config with a message_create trigger and a send_message action", () => {
    const valid = {
      triggers: [
        {
          event: "message_create",
          actions: [{ type: "send_message", content: "hi" }],
        },
      ],
    };

    const result = BotConfig.safeParse(valid);
    expect(result.success).toBe(true);
  });

  it("rejects a send_message action that omits content", () => {
    const invalid = {
      triggers: [
        {
          event: "message_create",
          actions: [{ type: "send_message" }],
        },
      ],
    };

    const result = BotConfig.safeParse(invalid);
    expect(result.success).toBe(false);
  });

  it("defaults on_error to 'stop' when an action omits it", () => {
    const config = {
      triggers: [
        {
          event: "message_create",
          actions: [{ type: "send_message", content: "hi" }],
        },
      ],
    };

    const result = BotConfig.parse(config);
    expect(result.triggers[0]?.actions[0]?.on_error).toBe("stop");
  });

  it("rejects on_error values outside the allowed set", () => {
    const invalid = {
      triggers: [
        {
          event: "message_create",
          actions: [{ type: "send_message", content: "hi", on_error: "retry" }],
        },
      ],
    };

    const result = BotConfig.safeParse(invalid);
    expect(result.success).toBe(false);
  });

  it("rejects an action whose type is not supported", () => {
    const invalid = {
      triggers: [
        {
          event: "message_create",
          actions: [{ type: "unknown_action", content: "hi" }],
        },
      ],
    };

    const result = BotConfig.safeParse(invalid);
    expect(result.success).toBe(false);
  });

  it("rejects a trigger whose event is not supported", () => {
    const invalid = {
      triggers: [
        {
          event: "unsupported_event",
          actions: [{ type: "send_message", content: "hi" }],
        },
      ],
    };

    const result = BotConfig.safeParse(invalid);
    expect(result.success).toBe(false);
  });
});
