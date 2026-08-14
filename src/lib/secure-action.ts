import { auth } from "@/auth";
import { z } from "zod";
import { withTenant } from "./tenant-context";

/**
 * A secure wrapper for Server Actions.
 * Enforces authentication, Zod validation, and multi-tenant context.
 */
export function createSecureAction<T extends z.ZodTypeAny, R>(
  schema: T,
  action: (data: z.infer<T>, session: any) => Promise<R>
) {
  return async (input: unknown): Promise<R | { error: string }> => {
    try {
      // 1. Authenticate
      const session = await auth();
      if (!session || !session.user || !session.user.id) {
        throw new Error("Unauthorized: You must be logged in to perform this action.");
      }

      // 2. Validate Input
      const validatedData = schema.parse(input);

      // 3. Execute with Tenant Context
      // This ensures that any 'prisma' calls inside the action are automatically scoped.
      return await withTenant(session.user.id, () => 
        action(validatedData, session)
      );

    } catch (error: any) {
      if (error instanceof z.ZodError) {
        return { error: `Validation Error: ${error.errors.map(e => e.message).join(", ")}` };
      }
      console.error("Secure Action Error:", error.message);
      return { error: error.message || "An internal security error occurred." };
    }
  };
}
