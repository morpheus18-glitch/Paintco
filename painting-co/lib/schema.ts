import { z } from 'zod';

export const EstimateInput = z.object({
  heightFt: z.coerce.number().min(7).max(20),
  coats: z.coerce.number().min(1).max(3),
  finish: z.enum(['matte','eggshell','semi-gloss'])
});

export type EstimateInputType = z.infer<typeof EstimateInput>;
