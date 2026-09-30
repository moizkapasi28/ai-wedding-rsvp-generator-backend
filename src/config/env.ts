import "dotenv/config";
import z from "zod";

// Checked once at startup so a missing or malformed variable fails loudly
// instead of at the first request that needs it.
// ponytail: validates only; callers still read process.env directly — switch them to `env` if typos become a problem
const envSchema = z
  .object({
    NODE_ENV: z.string().default("development"),
    PORT: z.coerce.number().int().positive().default(3000),
    DATABASE_URL: z.string().min(1),
    // Frontend origin without a trailing slash: CORS origin and base for links in emails and WhatsApp messages
    WEB_APP_URL: z.url(),

    JWT_SECRET: z.string().min(1),
    JWT_ACCESS_EXPIRATION_MINUTES: z.coerce.number().positive(),
    JWT_REFRESH_EXPIRATION_DAYS: z.coerce.number().positive(),
    JWT_RESET_PASSWORD_EXPIRATION_MINUTES: z.coerce.number().positive().optional(),
    JWT_VERIFY_EMAIL_EXPIRATION_MINUTES: z.coerce.number().positive().optional(),

    AWS_ACCESS_KEY_ID: z.string().min(1),
    AWS_SECRET_ACCESS_KEY: z.string().min(1),
    // The S3 client falls back to AWS_REGION when AWS_S3_REGION isn't set
    AWS_S3_REGION: z.string().min(1).optional(),
    AWS_REGION: z.string().min(1).optional(),
    AWS_BUCKET_NAME: z.string().min(1),
    AWS_BUCKET_PUT_URL_EXPIRE: z.coerce.number().int().positive(),

    // "ses" needs the AWS_SES_* vars, "smtp" (Nodemailer) needs the SMTP_* vars
    EMAIL_PROVIDER: z.enum(["ses", "smtp"]).default("ses"),
    AWS_SES_ACCESS_KEY_ID: z.string().min(1).optional(),
    AWS_SES_SECRET_ACCESS_KEY: z.string().min(1).optional(),
    AWS_SES_REGION: z.string().min(1).optional(),
    AWS_SENDER_EMAIL: z.email().optional(),
    SMTP_HOST: z.string().min(1).optional(),
    SMTP_PORT: z.coerce.number().int().positive().optional(),
    SMTP_USER: z.email().optional(),
    SMTP_PASS: z.string().min(1).optional(),
    PROJECT_NAME: z.string().min(1),

    // AI invite cards fail with a clear error without it, so the rest of the app can run
    GEMINI_API_KEY: z.string().min(1).optional(),

    REDIS_HOST: z.string().min(1).optional(),
    REDIS_PORT: z.coerce.number().int().positive().optional(),
    REDIS_PASSWORD: z.string().optional(),

    WHATSAPP_DEFAULT_COUNTRY_CODE: z
      .string()
      .regex(/^\d{1,4}$/, "digits only, e.g. 91")
      .optional(),
  })
  .refine((env) => env.AWS_S3_REGION || env.AWS_REGION, {
    message: "Set AWS_S3_REGION or AWS_REGION",
    path: ["AWS_S3_REGION"],
  })
  .superRefine((env, ctx) => {
    const required =
      env.EMAIL_PROVIDER === "smtp"
        ? (["SMTP_HOST", "SMTP_USER", "SMTP_PASS"] as const)
        : ([
            "AWS_SES_ACCESS_KEY_ID",
            "AWS_SES_SECRET_ACCESS_KEY",
            "AWS_SES_REGION",
            "AWS_SENDER_EMAIL",
          ] as const);
    for (const key of required) {
      if (!env[key]) {
        ctx.addIssue({
          code: "custom",
          message: `Required when EMAIL_PROVIDER=${env.EMAIL_PROVIDER}`,
          path: [key],
        });
      }
    }
  });

const result = envSchema.safeParse(process.env);

if (!result.success) {
  const problems = result.error.issues
    .map((issue) => `  ${issue.path.join(".") || "(env)"}: ${issue.message}`)
    .join("\n");
  // console, not the logger: pino's file stream isn't open yet, and exiting before it is throws
  console.error(`Invalid environment variables:\n${problems}`);
  process.exit(1);
}

export const env = result.data;
