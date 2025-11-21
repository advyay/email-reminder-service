import twilio, { Twilio } from "twilio";

const accountSid = process.env.TWILIO_SID;
const authToken = process.env.TWILIO_TOKEN;
const client: Twilio = twilio(accountSid, authToken);

interface WhatsAppMessageParams {
  body?: Record<string, any>;
  to: string; // e.g. "+919876543210"
  contendSid: string;
}

function normalizePhoneNumber(input: string): string {
  if (!input) return "";

  // Step 1: Remove all characters except digits and '+'
  let cleaned = input.replace(/[^\d+]/g, "");

  // Step 2: Replace leading '00' (international prefix) with '+'
  if (cleaned.startsWith("00")) {
    cleaned = "+" + cleaned.slice(2);
  }

  // Step 3: If number doesn’t start with '+', add it
  if (!cleaned.startsWith("+")) {
    cleaned = "+" + cleaned;
  }

  // Step 4: Remove any extra '+' signs in the middle
  cleaned = "+" + cleaned.slice(1).replace(/\+/g, "");

  return cleaned;
}

export function sendWMessage({
  body = {},
  to,
  contendSid,
}: WhatsAppMessageParams) {
  return client.messages.create({
    contentSid: contendSid,
    contentVariables: JSON.stringify(body),
    from: `whatsapp:+${process.env.TWILIO_NUMBER}`,
    to: `whatsapp:${normalizePhoneNumber(to)}`,
  });
}
