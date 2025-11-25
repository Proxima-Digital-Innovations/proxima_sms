
'use server';

import { ai } from '@/lib/genkit';
import { dbService } from '@/lib/dbService';
import { z } from 'zod';

const AiContextSchema = z.object({
  contextId: z.string().describe('The unique ID for the conversation context.'),
});

const AiUpdateContextSchema = z.object({
    contextId: z.string().describe('The unique ID for the conversation context.'),
    question: z.string().describe('The user\'s request or question.'),
    answer: z.string().describe('The AI\'s response or the result of the action.'),
});

/**
 * A tool that retrieves the history of an AI conversation context.
 */
export const getContextTool = ai.defineTool(
  {
    name: 'getContext',
    description: 'Retrieves the history of a conversation context. Use this to understand what has happened previously in the conversation.',
    inputSchema: AiContextSchema,
    outputSchema: z.string().describe('A summary of the conversation history.'),
  },
  async ({ contextId }) => {
    try {
      type AiContext = { history: any[] };
      const context = await dbService.getDoc<AiContext>('aiContexts', contextId);
      if (!context || !context.history) {
        return "No previous context found.";
      }
      // Return a summarized string of the history
      return JSON.stringify(context.history);
    } catch (error) {
      console.error('Error getting context:', error);
      return "Error retrieving context.";
    }
  }
);


/**
 * A tool that updates the history of an AI conversation context.
 */
export const updateContextTool = ai.defineTool(
    {
        name: 'updateContext',
        description: 'Updates the history of a conversation context with the latest interaction. Use this to save the result of your work.',
        inputSchema: AiUpdateContextSchema,
        outputSchema: z.string().describe('A confirmation message.'),
    },
    async ({ contextId, question, answer }) => {
        try {
            type AiContext = { history: any[] };
            const contextRef = await dbService.getDoc<AiContext>('aiContexts', contextId);
            const newHistoryEntry = { question, answer, timestamp: new Date() };
            
            if (contextRef) {
                const updatedHistory = [...(contextRef.history || []), newHistoryEntry];
                await dbService.updateDoc('aiContexts', contextId, { history: updatedHistory });
            } else {
                await dbService.setDoc('aiContexts', contextId, { history: [newHistoryEntry] });
            }
            return "Context updated successfully.";
        } catch (error) {
            console.error('Error updating context:', error);
            return "Error updating context.";
        }
    }
);
