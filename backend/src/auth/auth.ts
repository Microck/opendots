import { betterAuth } from 'better-auth';
import { drizzleAdapter } from 'better-auth/adapters/drizzle';
import { dbInstance as db } from '../db/db';
import * as schema from '../db/schema/auth';

const authBaseURL = process.env.BETTER_AUTH_BASE_URL;
const appBaseURL = process.env.APP_BASE_URL;

const resolvedAppBaseURL = appBaseURL || 'http://localhost:5173';
const errorURL = `${resolvedAppBaseURL}/signin`;
const trustedOriginsFromEnv = process.env.BETTER_AUTH_TRUSTED_ORIGINS
  ? process.env.BETTER_AUTH_TRUSTED_ORIGINS.split(',').map((origin) => origin.trim()).filter(Boolean)
  : [];

const trustedOrigins = Array.from(
  new Set([
    resolvedAppBaseURL,
    ...(authBaseURL ? [authBaseURL] : []),
    'http://localhost:5173',
    'http://127.0.0.1:5173',
    'http://100.124.44.113:5173',
    ...trustedOriginsFromEnv,
  ])
);

export const auth = betterAuth({
  ...(authBaseURL ? { baseURL: authBaseURL } : {}),
  trustedOrigins,
  onAPIError: {
    errorURL,
  },
  database: drizzleAdapter(db, {
    provider: 'sqlite',
    schema,
  }),
  socialProviders: {
    github: {
      clientId: process.env.GITHUB_CLIENT_ID!,
      clientSecret: process.env.GITHUB_CLIENT_SECRET!,
      scope: ['public_repo'],
    }
  },
  session: {
    cookieCache: {
      enabled: true,
      maxAge: 5 * 60,
    },
  },
});
