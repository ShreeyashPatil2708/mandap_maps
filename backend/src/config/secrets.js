import { SecretsManagerClient, GetSecretValueCommand } from '@aws-sdk/client-secrets-manager';

/**
 * Load secrets from AWS Secrets Manager and merge them into process.env,
 * without overwriting values that are already set. This lets the same code
 * run locally (values from .env) and in AWS (values from Secrets Manager).
 *
 * The secret is expected to be a JSON object, e.g.:
 *   { "PGPASSWORD": "...", "DATABASE_URL": "...", "REDIS_URL": "..." }
 *
 * Never hardcode credentials. This is the only place DB creds enter the app
 * in production.
 */
export async function loadSecrets() {
  const secretId = process.env.DB_SECRET_ID;
  if (!secretId) {
    // Local development: rely on .env. Nothing to load.
    return;
  }

  const client = new SecretsManagerClient({ region: process.env.AWS_REGION });
  const res = await client.send(new GetSecretValueCommand({ SecretId: secretId }));

  if (!res.SecretString) {
    throw new Error(`Secret ${secretId} has no SecretString`);
  }

  const parsed = JSON.parse(res.SecretString);
  for (const [key, value] of Object.entries(parsed)) {
    // .env / real environment wins over Secrets Manager only if already set.
    if (process.env[key] === undefined || process.env[key] === '') {
      process.env[key] = String(value);
    }
  }
}
