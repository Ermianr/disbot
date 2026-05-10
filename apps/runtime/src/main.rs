fn main() {
    println!("runtime: scaffold — no-op");
}

#[cfg(test)]
mod tests {
    use disbot_shared::dsl::BotConfig;

    #[test]
    fn runtime_can_deserialize_bot_config_from_shared() {
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

        let parsed: BotConfig =
            serde_json::from_value(json).expect("valid config should parse");
        assert_eq!(parsed.triggers.len(), 1);
    }
}
