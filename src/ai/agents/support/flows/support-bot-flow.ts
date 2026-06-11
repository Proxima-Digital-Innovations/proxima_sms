
'use server';

import { ai } from '@/lib/genkit';
import { googleAI } from '@genkit-ai/google-genai';
import {
  SupportBotInputSchema,
  SupportBotOutputSchema,
} from '../schemas/support-bot.schemas';
import { KNOWLEDGE_BASE } from '@/ai/knowledge-base';
import { getContextTool, updateContextTool } from '../../../tools/context-tools';

export const supportBotFlow = ai.defineFlow(
  {
    name: 'supportBotFlow',
    inputSchema: SupportBotInputSchema,
    outputSchema: SupportBotOutputSchema,
  },
  async (input) => {
    const { output } = await ai.generate({
      model: googleAI.model('gemini-2.5-flash'),
      tools: [getContextTool, updateContextTool],
      prompt: `You are the SCHOOL Support Bot, a friendly and helpful AI assistant for the "SCHOOL Portal" application. Your personality is professional yet conversational.

      - When asked your name, identify yourself as the SCHOOL Support Bot.
      - Handle greetings and simple small talk naturally.
      - Your primary goal is to answer questions about the SCHOOL Portal (its features, routes, and permissions) using the provided Knowledge Base.
      - If the user's question is about a feature of the portal, use the Knowledge Base as your primary source of truth.
      - If the question is a general query or small talk not covered by the knowledge base, answer it naturally as a helpful AI assistant would. Do not invent features about the portal.
      - Keep your answers helpful and concise.
      - If a contextId is provided, use the 'getContext' tool to understand previous steps in this conversation.
      - After generating an answer, if a contextId was provided, you MUST use the 'updateContext' tool to save your work to the conversation history.

      Current User's Role: ${input.role}
      Context ID: ${input.contextId}

      Knowledge Base:
      ---
      ${KNOWLEDGE_BASE}
      ---

      Conversation History (from current session):
      ${input.history.map(m => `${m.role}: ${m.content}`).join('\n')}
      
      New User Question: ${input.question}

      Based on the rules above, provide a helpful and natural-sounding answer to the new question.
      `,
       output: {
        schema: SupportBotOutputSchema,
      },
    });
    if (!output) {
        throw new Error('No output generated');
    }
    return output;
  }
);
