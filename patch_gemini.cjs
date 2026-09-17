const fs = require('fs');
let code = fs.readFileSync('src/App.tsx', 'utf8');

// Replace standard phrases
code = code.replace(/Processing audio with Gemini AI/g, 'Processing audio with AI');
code = code.replace(/Recording high-definition audio for Gemini/g, 'Recording high-definition audio for AI');
code = code.replace(/Translating with Gemini/g, 'Translating with AI');
code = code.replace(/Uploading and transcribing audio with Gemini AI/g, 'Uploading and transcribing audio with AI');
code = code.replace(/Stop & Transcribe with Gemini/g, 'Stop & Transcribe with AI');
code = code.replace(/Record Audio via Gemini/g, 'Record Audio via AI');
code = code.replace(/Translate with Gemini AI/g, 'Translate with AI');
code = code.replace(/Translate with Gemini/g, 'Translate with AI');
code = code.replace(/Translating via Gemini/g, 'Translating with AI');
code = code.replace(/Audio File Transcription via Gemini AI/g, 'Audio File Transcription via AI');
code = code.replace(/Transcribing with Gemini/g, 'Transcribing with AI');
code = code.replace(/Transcribing speech with Gemini AI/g, 'Transcribing speech with AI');

fs.writeFileSync('src/App.tsx', code);
