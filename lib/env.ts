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

export function getOptionalEnv(name: string) {
  const value = readEnv(name);

  if (!value) {
    return undefined;
  }

  return value;
}

export function getOptionalMultilineEnv(name: string) {
  const value = getOptionalEnv(name);

  if (!value) {
    return undefined;
  }

  return value.replace(/\\n/g, "\n");
}

export function hasEnv(...names: string[]) {
  return names.every((name) => Boolean(readEnv(name)));
}
