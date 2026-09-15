import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI, Modality } from "@google/genai";
import dotenv from "dotenv";

dotenv.config();

function getGeminiClient() {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error("GEMINI_API_KEY is not configured in the server environment.");
  }
  return new GoogleGenAI({
    apiKey,
    httpOptions: {
      headers: {
        "User-Agent": "aistudio-build",
      },
    },
  });
}

async function startServer() {
  const app = express();
  const PORT = 3000;

  // Support large payloads for audio transcription (~100MB file = ~133MB base64)
  app.use(express.json({ limit: "200mb" }));
  app.use(express.urlencoded({ extended: true, limit: "200mb" }));

  // Health check
  app.get("/api/health", (_req, res) => {
    res.json({ status: "ok", service: "PolyglotScribe" });
  });


  // API Route: Language Detection
  app.post("/api/detect-language", async (req, res) => {
    try {
      const { text } = req.body;
      if (!text || typeof text !== "string" || !text.trim()) {
        res.status(400).json({ error: "Text is required for language detection." });
        return;
      }

      const ai = getGeminiClient();
      const systemInstruction = `Analyze the given text and determine if it is Afaan Oromoo, Amharic, or English.\nReturn strictly ONLY one of the following codes depending on the detected language:\n- 'om-ET' if it is Afaan Oromoo\n- 'am-ET' if it is Amharic\n- 'en-US' if it is English\nIf you are unsure, default to 'en-US'. Do not return any other text.`;

      let detectedLang = "en-US";
      try {
        const response = await ai.models.generateContent({
          model: "gemini-3.8-flash",
          contents: text,
          config: {
            systemInstruction,
            temperature: 0.1,
          },
        });
        detectedLang = response.text?.trim() || "en-US";
      } catch (err) {
        // Fallback
        const fallbackResponse = await ai.models.generateContent({
          model: "gemini-3.1-flash-lite",
          contents: text,
          config: {
            systemInstruction,
            temperature: 0.1,
          },
        });
        detectedLang = fallbackResponse.text?.trim() || "en-US";
      }
      
      // Basic validation to ensure we only return expected codes
      if (!["om-ET", "am-ET", "en-US"].includes(detectedLang)) {
        detectedLang = "en-US";
      }

      res.json({ language: detectedLang });
    } catch (error) {
      console.error("Detect Language API error:", error);
      res.status(500).json({ error: "Failed to detect language." });
    }
  });

  // API Route: Translation
  app.post("/api/translate", async (req, res) => {
    try {
      const { text, sourceLang, targetLang } = req.body;
      if (!text || typeof text !== "string" || !text.trim()) {
        res.status(400).json({ error: "Text is required for translation." });
        return;
      }

      const ai = getGeminiClient();
      const systemInstruction = `You are an expert native linguist and conceptual translator in Horn of Africa languages (specifically Afaan Oromoo and Amharic) as well as English.
Your goal is to provide a PERFECT, natural-sounding translation from ${sourceLang || "the source language"} to ${targetLang || "the target language"}.
Instead of just translating word-for-word, you must FIRST deeply understand the underlying ideas, concepts, and context of the text. Then, express those exact same ideas in the target language in a way that sounds perfectly native, fluid, and authentic to a local speaker.

Crucial Rules:
1. Translate the IDEA and MEANING perfectly. Do not output awkward literal translations.
2. Preserve formatting strictly (including stanza line breaks, poem verses, spacing, numbers, and punctuation).
3. Maintain natural conversational idioms, cultural nuance, and authentic tone.
4. Return ONLY the translated text without extra introductory commentary or markdown fences.`;

      let translated = "";
      try {
        const response = await ai.models.generateContent({
          model: "gemini-3.8-flash",
          contents: text,
          config: {
            systemInstruction,
            temperature: 0.3,
          },
        });
        translated = response.text?.trim() || "";
      } catch (err: any) {
        if (err.status === 503 || (err.message && err.message.includes('503'))) {
          console.warn("gemini-3.8-flash overloaded, falling back to gemini-3.1-flash-lite");
          const fallbackResponse = await ai.models.generateContent({
            model: "gemini-3.1-flash-lite",
            contents: text,
            config: {
              systemInstruction,
              temperature: 0.3,
            },
          });
          translated = fallbackResponse.text?.trim() || "";
        } else {
          throw err;
        }
      }

      res.json({ translatedText: translated });
    } catch (error: any) {
      console.error("Translation API error:", error);
      res.status(500).json({
        error: error?.message || "Failed to translate text. Please try again.",
      });
    }
  });

  // API Route: Text-To-Speech (TTS)
  app.post("/api/tts", async (req, res) => {
    try {
      const { text, voiceName = "Kore", prompt = "" } = req.body;
      if (!text || typeof text !== "string" || !text.trim()) {
        res.status(400).json({ error: "Text is required for TTS generation." });
        return;
      }

      const ai = getGeminiClient();
      const fullPrompt = prompt
        ? `${prompt} Speak this text clearly and with authentic rhythm: ${text}`
        : `Speak this text clearly and naturally: ${text}`;

      const response = await ai.models.generateContent({
        model: "gemini-3.1-flash-tts-preview",
        contents: [{ parts: [{ text: fullPrompt }] }],
        config: {
          responseModalities: [Modality.AUDIO],
          speechConfig: {
            voiceConfig: {
              prebuiltVoiceConfig: { voiceName },
            },
          },
        },
      });

      const audioBase64 =
        response.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;

      if (!audioBase64) {
        res.status(500).json({ error: "No audio data received from TTS service." });
        return;
      }

      res.json({ audioBase64, sampleRate: 24000 });
    } catch (error: any) {
      console.error("TTS API error:", error);
      res.status(500).json({
        error: error?.message || "Failed to generate speech audio.",
      });
    }
  });

  // API Route: Audio File Transcription
  app.post("/api/transcribe-audio", async (req, res) => {
    try {
      const { audioBase64, mimeType = "audio/mp3", sourceLang = "" } = req.body;
      if (!audioBase64 || typeof audioBase64 !== "string") {
        res.status(400).json({ error: "Audio base64 data is required." });
        return;
      }

      const ai = getGeminiClient();
      
      const languageHint = sourceLang 
        ? `The expected primary spoken language is ${sourceLang === 'om-ET' ? 'Afaan Oromoo' : sourceLang === 'am-ET' ? 'Amharic' : 'English'}. ` 
        : `First, identify if the spoken language is Afaan Oromoo, Amharic, or English. `;

      const prompt =
        `Analyze this audio recording with MAXIMUM precision. ${languageHint}` +
        "You must transcribe EVERY SINGLE WORD spoken, even if the audio volume is very low, if there is background noise, or if multiple people are speaking simultaneously or interrupting each other. " +
        "If there are sudden changes in tone, pitch, volume, or speaking speed, adapt and continue transcribing flawlessly without skipping any words. " +
        "Pay close attention to fast-paced speech, rapid pronunciation, and complex regional dialects to ensure perfect accuracy. " +
        "Transcribe strictly using the proper orthography of the detected language (Qubee for Afaan Oromoo, Ge'ez script for Amharic, Latin alphabet for English). " +
        "Preserve rhythm and structure: if it sounds like a poem, chant, or song, format into stanzas/lines. Otherwise, format into clean paragraphs. Return ONLY the transcribed text, nothing else.";

      let transcription = "";

      // Try gemini-3.5-transcribe first
      try {
        const response = await ai.models.generateContent({
          model: "gemini-3.5-transcribe",
          contents: {
            parts: [
              {
                inlineData: {
                  mimeType,
                  data: audioBase64,
                },
              },
              { text: prompt },
            ],
          },
        });
        transcription = response.text?.trim() || "";
      } catch (err: any) {
        console.warn("gemini-3.5-transcribe attempt had an issue, falling back:", err.message);
        
        const fallbackModel = err.status === 503 || (err.message && err.message.includes('503')) 
          ? "gemini-3.1-flash-lite" 
          : "gemini-3.8-flash";

        console.log(`Using fallback model: ${fallbackModel}`);

        const fallbackResponse = await ai.models.generateContent({
          model: fallbackModel,
          contents: {
            parts: [
              {
                inlineData: {
                  mimeType,
                  data: audioBase64,
                },
              },
              { text: prompt },
            ],
          },
        });
        transcription = fallbackResponse.text?.trim() || "";
      }

      res.json({ transcription });
    } catch (error: any) {
      console.error("Transcription API error:", error);
      res.status(500).json({
        error: error?.message || "Failed to transcribe audio file.",
      });
    }
  });

  // Vite middleware for development vs static build for production
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (_req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`PolyglotScribe server running on http://0.0.0.0:${PORT}`);
  });
}

startServer();
