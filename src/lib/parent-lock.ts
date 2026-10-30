const encoder = new TextEncoder();

function hex(bytes: Uint8Array) {
  return Array.from(bytes, (byte) => byte.toString(16).padStart(2, "0")).join(
    "",
  );
}

export async function createParentPin(pin: string) {
  const salt = crypto.getRandomValues(new Uint8Array(16));
  return { pinSalt: hex(salt), pinHash: await derive(pin, salt) };
}

async function derive(pin: string, salt: Uint8Array) {
  const key = await crypto.subtle.importKey(
    "raw",
    encoder.encode(pin),
    "PBKDF2",
    false,
    ["deriveBits"],
  );
  const bits = await crypto.subtle.deriveBits(
    {
      name: "PBKDF2",
      hash: "SHA-256",
      iterations: 120000,
      salt: salt as BufferSource,
    },
    key,
    256,
  );
  return hex(new Uint8Array(bits));
}

export async function verifyParentPin(
  pin: string,
  saltHex: string,
  expected: string,
) {
  if (!/^([a-f0-9]{2}){16}$/.test(saltHex) || !/^[a-f0-9]{64}$/.test(expected))
    return false;
  const salt = new Uint8Array(
    saltHex.match(/../g)!.map((pair) => parseInt(pair, 16)),
  );
  const actual = await derive(pin, salt);
  let mismatch = 0;
  for (let index = 0; index < actual.length; index++)
    mismatch |= actual.charCodeAt(index) ^ expected.charCodeAt(index);
  return mismatch === 0;
}
