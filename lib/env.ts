function readEnv(name: string) {
  return process.env[name];
}

export function getRequiredEnv(name: string) {
  const value = readEnv(name);

  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }

  return value;
}
