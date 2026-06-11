# AI Integration Strategy for SCHOOL Portal

This document outlines the architecture and implementation strategy for integrating Generative AI features into the SCHOOL school management portal using Firebase Genkit.

## 1. Core Technology

-   **Firebase Genkit:** An open-source framework from Firebase designed to streamline the development of AI-powered features. It provides helper functions to define prompts, structure inputs/outputs, and manage interactions with various language models.

-   **Google Gemini (via Genkit):** We use the `gemini-1.5-flash` model, provided through the `@genkit-ai/google-genai` plugin. This model is chosen for its balance of speed, capability, and cost-effectiveness.

-   **Next.js Server Actions:** All AI logic is executed on the server using Next.js Server Actions (`'use server'`). This keeps API keys and complex logic secure on the backend, preventing them from being exposed to the client.

## 2. Architectural Approach

To build a scalable and maintainable AI engine that works correctly within the Next.js App Router paradigm, we followed a specific architectural pattern that avoids common "use server" boundary errors.

### The "Agent" Model

The entire AI engine is organized into "agents" located in `src/ai/agents`. Each agent is a specialist responsible for a specific domain of tasks:

-   **`academic`**: Handles tasks related to student performance and data narration (e.g., writing report card comments).
-   **`financial`**: Handles financial analysis and data processing (e.g., categorizing expenses).
-   **`text`**: Provides general-purpose text utilities like summarization and drafting.

### The 3-File Agent Structure

Each individual agent (e.g., `text/summarizer`) is composed of three distinct files, each with a clear responsibility. This pattern is crucial for preventing circular dependencies and respecting Next.js's module boundaries.

**a. The Schema File (`schemas/<agent-name>.schemas.ts`)**

This is the foundation of the agent. It has no dependencies on other agent files.

-   **Purpose:** To define the data structures for the agent's inputs and outputs.
-   **Technology:** We use `zod`, a TypeScript-first schema validation library.
-   **Exports:**
    -   `[AgentName]InputSchema`: A Zod schema defining the expected input object.
    -   `[AgentName]OutputSchema`: A Zod schema defining the shape of the object the AI should return.
    -   `[AgentName]Input` / `[AgentName]Output`: TypeScript types inferred from the Zod schemas.

**b. The Flow File (`flows/<agent-name>-flow.ts`)**

This is the server-side core of the agent, containing the actual prompt and Genkit logic.

-   **Purpose:** To define the Genkit `flow` and the `prompt` that will be sent to the Gemini model.
-   **`'use server'`:** This file is a server component.
-   **Imports:** It imports the `defineFlow`, `definePrompt`, and `generate` functions from our central Genkit library, as well as the schemas from the corresponding `.schemas.ts` file.
-   **Implementation:**
    1.  It defines a `prompt` using `ai.definePrompt`, specifying the `input` and `output` schemas. The prompt template itself is written in Handlebars syntax (`{{{variable}}}`).
    2.  It defines a `flow` using `ai.defineFlow`, which wraps the prompt call. This is where additional logic (like pre-processing data) could be added before calling the AI.
    3.  It exports the flow (e.g., `export const summarizeTextFlow = ...`).

**c. The Public Agent File (`<agent-name>.ts`)**

This is the public-facing entry point for the agent. It's the only file that UI components or other server modules should interact with.

-   **Purpose:** To provide a clean, simple `async` function that can be called from other parts of the application.
-   **`'use server'`:** This file is also a server component.
-   **Imports:** It imports the `flow` from the corresponding `-flow.ts` file and the `Input`/`Output` types from the `.schemas.ts` file.
-   **Implementation:**
    1.  It defines and exports a single `async` function (e.g., `export async function summarizeText(...)`).
    2.  Inside this function, it calls and `await`s the imported flow, passing the input and returning the output.
    3.  It also re-exports the `Input` and `Output` types for convenience.

This three-file structure ensures a one-way dependency flow (`agent` -> `flow` -> `schema`), which is clean, scalable, and compliant with Next.js rules.

### Centralized AI Engine

Finally, the `src/ai/index.ts` file acts as a central hub. It imports all the public-facing agent functions and exports them in a single, organized `aiEngine` object. This provides a clean and discoverable API for the rest of the application to use.

```typescript
// Example of using the engine from another file
import { aiEngine } from '@/ai';

async function someFunction() {
  const summary = await aiEngine.text.summarize({ text: '...' });
  console.log(summary);
}
```

This comprehensive structure ensures our AI integration is robust, type-safe, and works seamlessly within the Next.js server environment.
