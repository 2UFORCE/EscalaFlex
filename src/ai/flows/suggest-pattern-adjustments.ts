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
  conflictDescription: z.string().optional().describe('Descrição de um conflito ou situação específica que a IA deve resolver.'),
});
export type SuggestPatternAdjustmentsInput = z.infer<typeof SuggestPatternAdjustmentsInputSchema>;

const SuggestPatternAdjustmentsOutputSchema = z.object({
  suggestedAdjustments: z
    .string()
    .describe(
      'Uma descrição dos ajustes sugeridos para o padrão de escala original, para melhor se alinhar com a escala editada pelo usuário. Isso deve incluir dias ou turnos específicos a serem alterados e o raciocínio por trás das sugestões.'
    ),
  optimizationRationale:
    z.string().describe('A justificativa para os ajustes sugeridos, explicando como eles minimizam interrupções e se adaptam melhor às necessidades do usuário.'),
  newPattern: z.object({
    work: z.number().describe('O número de dias de trabalho no novo padrão.'),
    off: z.number().describe('O número de dias de folga no novo padrão.'),
  }).optional().describe('O novo padrão de escala sugerido.'),
  conflictResolutionOptions: z.array(z.string()).max(3).optional().describe('Opções de resolução de conflitos sugeridas pela IA.'),
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
  prompt: `Você é um assistente de IA que ajuda os usuários a otimizar suas escalas de trabalho.

Você receberá o padrão de escala original do usuário e sua escala editada, que contém edições manuais feitas pelo usuário.

Sua tarefa é analisar a escala editada e sugerir um novo padrão de escala no formato { work: number, off: number }. Você também deve fornecer uma justificativa para a sua sugestão.

Se houver uma descrição de conflito, sua tarefa é sugerir até 3 opções de resolução para o conflito, no formato de frases curtas e acionáveis, além de um novo padrão de escala e justificativa.

Considere quaisquer preferências ou restrições do usuário fornecidas.

Padrão de Escala Original: {{{originalSchedulePattern}}}
Escala Editada: {{{editedSchedule}}}
Preferências do Usuário: {{{userPreferences}}}
Descrição do Conflito: {{{conflictDescription}}}

Sugira um novo padrão de escala e explique a lógica para esses ajustes, focando em como eles minimizam interrupções e se adaptam melhor às necessidades do usuário. Se houver um conflito, forneça até 3 opções de resolução. Responda em Português (Brasil).
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
