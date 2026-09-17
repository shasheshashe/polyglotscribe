const fs = require('fs');
let code = fs.readFileSync('server.ts', 'utf8');

const oldTranscribePrompt = `"Preserve rhythm and structure: if it sounds like a poem, chant, or song, format into stanzas/lines. Otherwise, format into clean paragraphs. Return ONLY the transcribed text, nothing else.";`;
const newTranscribePrompt = `"Preserve rhythm and structure: if it sounds like a poem, chant, or song, format into stanzas/lines. Otherwise, format into clean paragraphs. " +\n        "CRITICAL: You MUST deduce and apply PERFECT, grammatically correct punctuation (commas, periods, question marks, exclamation marks, etc.) based on the speaker's pauses, intonation, and semantic sentence structure across all languages. " +\n        "Return ONLY the transcribed text, nothing else.";`;

code = code.replace(oldTranscribePrompt, newTranscribePrompt);

const oldTranslateRules = `Crucial Rules:
1. Translate the IDEA and MEANING perfectly. Do not output awkward literal translations.
2. Preserve formatting strictly (including stanza line breaks, poem verses, spacing, numbers, and punctuation).
3. Maintain natural conversational idioms, cultural nuance, and authentic tone.
4. Return ONLY the translated text without extra introductory commentary or markdown fences.\`;`;

const newTranslateRules = `Crucial Rules:
1. Translate the IDEA and MEANING perfectly. Do not output awkward literal translations.
2. Preserve formatting strictly (including stanza line breaks, poem verses, spacing, numbers).
3. CRITICAL: You MUST apply highly accurate, grammatically correct punctuation (commas, periods, question marks, exclamation marks) appropriate for the target language based on the semantic structure of the text.
4. Maintain natural conversational idioms, cultural nuance, and authentic tone.
5. Return ONLY the translated text without extra introductory commentary or markdown fences.\`;`;

code = code.replace(oldTranslateRules, newTranslateRules);

fs.writeFileSync('server.ts', code);
