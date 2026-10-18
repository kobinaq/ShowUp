export function authorizeCron(header: string | null, secret: string | undefined) {
  if (!secret || header !== `Bearer ${secret}`) return false;
  return true;
}
