use disbot_shared::dsl::{BotConfig, SendMessageActionOnError};

#[test]
fn deserializes_a_valid_bot_config() {
    let json = serde_json::json!({
        "triggers": [
            {
                "event": "message_create",
                "actions": [
                    { "type": "send_message", "content": "hi" }
                ]
            }
        ]
    });

    let parsed: BotConfig = serde_json::from_value(json).expect("valid config should parse");
    let action = &parsed.triggers[0].actions[0];
    assert_eq!(action.content, "hi");
    assert_eq!(action.on_error, SendMessageActionOnError::Stop);
}

#[test]
fn rejects_a_payload_missing_required_fields() {
    let json = serde_json::json!({
        "triggers": [
            {
                "event": "message_create",
                "actions": [
                    { "type": "send_message" }
                ]
            }
        ]
    });

    let result: Result<BotConfig, _> = serde_json::from_value(json);
    assert!(result.is_err(), "missing required content should fail");
}
