import { env } from "../config/env";
import { GoogleGenAI } from "@google/genai";

let client: GoogleGenAI | null = null;

export function getGeminiClient(): GoogleGenAI {
  if (!client) {
    if (!env.GEMINI_API_KEY) {
      throw new Error("GEMINI_API_KEY is not set in environment variables.");
    }
    client = new GoogleGenAI({ apiKey: env.GEMINI_API_KEY });
  }
  return client;
}
