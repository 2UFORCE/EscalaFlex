// This is a server-side file.
'use server';

/**
 * @fileOverview Analyzes the user's edited schedule and suggests adjustments to the base schedule pattern.
 *
 * - suggestPatternAdjustments - A function that handles the schedule pattern adjustment suggestion process.
 * - SuggestPatternAdjustmentsInput - The input type for the suggestPatternAdjustments function.
 * - SuggestPatternAdjustmentsOutput - The return type for the suggestPatternAdjustments function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const SuggestPatternAdjustmentsInputSchema = z.object({
  originalSchedulePattern: z.string().describe('The original, repeating schedule pattern.'),
  editedSchedule: z.string().describe('The user-edited schedule, showing deviations from the pattern.'),
  userPreferences: z.string().optional().describe('Any user preferences or constraints to consider.'),
});
export type SuggestPatternAdjustmentsInput = z.infer<typeof SuggestPatternAdjustmentsInputSchema>;

const SuggestPatternAdjustmentsOutputSchema = z.object({
  suggestedAdjustments: z
    .string()
    .describe(
      'A description of the suggested adjustments to the original schedule pattern, to better align with the user-edited schedule.  This should include specific days or shifts to change, and the reasoning behind the suggestions.'
    ),
  optimizationRationale:
    z.string().describe('The rationale for the suggested adjustments, explaining how they minimize disruptions and better fit the user needs.'),
});
export type SuggestPatternAdjustmentsOutput = z.infer<typeof SuggestPatternAdjustmentsOutputSchema>;

export async function suggestPatternAdjustments(
  input: SuggestPatternAdjustmentsInput
): Promise<SuggestPatternAdjustmentsOutput> {
  return suggestPatternAdjustmentsFlow(input);
}

const prompt = ai.definePrompt({
  name: 'suggestPatternAdjustmentsPrompt',
  input: {schema: SuggestPatternAdjustmentsInputSchema},
  output: {schema: SuggestPatternAdjustmentsOutputSchema},
  prompt: `You are an AI assistant that helps users optimize their work schedules.

You will be provided with the user's original schedule pattern and their edited schedule, which contains manual edits made by the user.

Your task is to analyze the edited schedule and suggest adjustments to the original schedule pattern to minimize the need for frequent manual edits.

Consider any user preferences or constraints provided.

Original Schedule Pattern: {{{originalSchedulePattern}}}
Edited Schedule: {{{editedSchedule}}}
User Preferences: {{{userPreferences}}}

Suggest adjustments to the original schedule pattern, and explain the rationale for these adjustments, focusing on how they minimize disruptions and better fit the user's needs.
`,config: {
    safetySettings: [
      {
        category: 'HARM_CATEGORY_HATE_SPEECH',
        threshold: 'BLOCK_ONLY_HIGH',
      },
      {
        category: 'HARM_CATEGORY_DANGEROUS_CONTENT',
        threshold: 'BLOCK_NONE',
      },
      {
        category: 'HARM_CATEGORY_HARASSMENT',
        threshold: 'BLOCK_MEDIUM_AND_ABOVE',
      },
      {
        category: 'HARM_CATEGORY_SEXUALLY_EXPLICIT',
        threshold: 'BLOCK_LOW_AND_ABOVE',
      },
    ],
  },
});

const suggestPatternAdjustmentsFlow = ai.defineFlow(
  {
    name: 'suggestPatternAdjustmentsFlow',
    inputSchema: SuggestPatternAdjustmentsInputSchema,
    outputSchema: SuggestPatternAdjustmentsOutputSchema,
  },
  async input => {
    const {output} = await prompt(input);
    return output!;
  }
);
