import "server-only";

import webpush from "web-push";

import { getOptionalEnv } from "@/lib/env";

type VapidConfig = {
  subject: string;
  publicKey: string;
  privateKey: string;
};

let configured = false;

export function getVapidConfig(): VapidConfig | null {
  const subject = getOptionalEnv("VAPID_SUBJECT");
  const publicKey = getOptionalEnv("VAPID_PUBLIC_KEY");
  const privateKey = getOptionalEnv("VAPID_PRIVATE_KEY");

  if (!subject || !publicKey || !privateKey) {
    return null;
  }

  return {
    subject,
    publicKey,
    privateKey,
  };
}

export function getPushPublicKey() {
  return getVapidConfig()?.publicKey ?? null;
}

export function isPushConfigured() {
  return Boolean(getVapidConfig());
}

export function configureWebPush() {
  const config = getVapidConfig();

  if (!config) {
    return false;
  }

  if (!configured) {
    webpush.setVapidDetails(config.subject, config.publicKey, config.privateKey);
    configured = true;
  }

  return true;
}
