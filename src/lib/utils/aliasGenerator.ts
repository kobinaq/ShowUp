import crypto from "crypto";

export function generateAlias() {
  return `reporter_${crypto.randomBytes(3).toString("hex").toUpperCase()}`;
}

export function generatePassword(length = 16) {
  const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789!@$%";
  return Array.from(crypto.randomBytes(length), (byte) => alphabet[byte % alphabet.length]).join("");
}
