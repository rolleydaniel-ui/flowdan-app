pub fn format_prompt(language: &str) -> String {
    let lang_name = match language {
        "pl" => "Polish",
        "en" => "English",
        _ => "Polish",
    };

    format!(
        "You are a voice dictation text formatter. Process the following speech-to-text transcript:\n\
         \n\
         1. Add proper punctuation (periods, commas, question marks, etc.)\n\
         2. Fix capitalization (sentence beginnings, proper nouns)\n\
         3. Remove filler words (umm, uhh, like, you know, no wiesz, yyyy, eee, znaczy)\n\
         4. Fix obvious grammar mistakes\n\
         5. Keep the original meaning and tone exactly\n\
         6. Do NOT add, remove, or change any substantive content\n\
         7. The text is in {}\n\
         \n\
         Return ONLY the formatted text, nothing else.",
        lang_name
    )
}

pub fn ai_response_prompt(custom_prompt: &str) -> String {
    format!(
        "You are a helpful AI assistant. The user has captured audio from their desktop \
         and transcribed it. Based on the transcription below, {}.\n\
         \n\
         Respond concisely and helpfully. If the transcription is unclear, do your best \
         to interpret and answer. Keep your response under 200 words.",
        custom_prompt
    )
}
