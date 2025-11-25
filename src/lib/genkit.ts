
import { genkit } from 'genkit';
import { googleAI } from '@genkit-ai/google-genai';
import { dbService } from './dbService';

type SafetySetting = {
  category: 'HARM_CATEGORY_HATE_SPEECH' | 'HARM_CATEGORY_SEXUALLY_EXPLICIT' | 'HARM_CATEGORY_HARASSMENT' | 'HARM_CATEGORY_DANGEROUS_CONTENT';
  threshold: 'BLOCK_NONE' | 'BLOCK_ONLY_HIGH' | 'BLOCK_MEDIUM_AND_ABOVE' | 'BLOCK_LOW_AND_ABOVE';
};

type AiConfig = {
  safetySettings?: SafetySetting[];
  temperature?: number;
  maxOutputTokens?: number;
};

// Function to fetch AI configuration from Firestore
async function getAiConfig(): Promise<AiConfig> {
  try {
    const configDoc = await dbService.getDoc<AiConfig>('system', 'aiConfig');
    if (!configDoc) {
      console.warn("AI configuration not found in Firestore. Using default settings.");
      return {};
    }

    const config: AiConfig = {};

    if (configDoc.safetySettings) {
      config.safetySettings = configDoc.safetySettings;
    }
    if (configDoc.temperature !== undefined) {
      config.temperature = configDoc.temperature;
    }
    if (configDoc.maxOutputTokens !== undefined) {
      config.maxOutputTokens = configDoc.maxOutputTokens;
    }

    return config;
  } catch (error) {
    console.error("Failed to fetch AI configuration, using defaults:", error);
    return {};
  }
}


// Initialize the genkit AI instance
export const ai = genkit({
  plugins: [
    googleAI({
      apiKey: process.env.GEMINI_API_KEY,
    }),
  ],
});
