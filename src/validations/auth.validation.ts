import { z } from "zod";
export const signUpBodySchema = z.object({
  first_name: z.string(),
  last_name: z.string(),
  mobile_number: z.string(),
  email: z.string(),
  password: z.string(),
});

export const signUpSchema = z.object({
  body: signUpBodySchema,
});

export type SignUpDto = z.infer<typeof signUpBodySchema>;

export const loginBodySchema = z.object({
  email: z.string(),
  password: z.string(),
});

export const loginSchema = z.object({
  body: loginBodySchema,
});
export type LoginDto = z.infer<typeof loginBodySchema>;
