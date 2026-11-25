// Pure-JS DES-ECB decryption (zero OpenSSL legacy provider dependency, compatible with Node 20+)
// Used exclusively to decode JioSaavn's public `encrypted_media_url` into direct CDN AAC URLs.

const IP = [
  58, 50, 42, 34, 26, 18, 10, 2, 60, 52, 44, 36, 28, 20, 12, 4,
  62, 54, 46, 38, 30, 22, 14, 6, 64, 56, 48, 40, 32, 24, 16, 8,
  57, 49, 41, 33, 25, 17, 9, 1, 59, 51, 43, 35, 27, 19, 11, 3,
  61, 53, 45, 37, 29, 21, 13, 5, 63, 55, 47, 39, 31, 23, 15, 7,
];

const FP = [
  40, 8, 48, 16, 56, 24, 64, 32, 39, 7, 47, 15, 55, 23, 63, 31,
  38, 6, 46, 14, 54, 22, 62, 30, 37, 5, 45, 13, 53, 21, 61, 29,
  36, 4, 44, 12, 52, 20, 60, 28, 35, 3, 43, 11, 51, 19, 59, 27,
  34, 2, 42, 10, 50, 18, 58, 26, 33, 1, 41, 9, 49, 17, 57, 25,
];

const E = [
  32, 1, 2, 3, 4, 5, 4, 5, 6, 7, 8, 9,
  8, 9, 10, 11, 12, 13, 12, 13, 14, 15, 16, 17,
  16, 17, 18, 19, 20, 21, 20, 21, 22, 23, 24, 25,
  24, 25, 26, 27, 28, 29, 28, 29, 30, 31, 32, 1,
];

const P = [
  16, 7, 20, 21, 29, 12, 28, 17, 1, 15, 23, 26, 5, 18, 31, 10,
  2, 8, 24, 14, 32, 27, 3, 9, 19, 13, 30, 6, 22, 11, 4, 25,
];

const PC1 = [
  57, 49, 41, 33, 25, 17, 9, 1, 58, 50, 42, 34, 26, 18,
  10, 2, 59, 51, 43, 35, 27, 19, 11, 3, 60, 52, 44, 36,
  63, 55, 47, 39, 31, 23, 15, 7, 62, 54, 46, 38, 30, 22,
  14, 6, 61, 53, 45, 37, 29, 21, 13, 5, 28, 20, 12, 4,
];

const PC2 = [
  14, 17, 11, 24, 1, 5, 3, 28, 15, 6, 21, 10, 23, 19, 12, 4,
  26, 8, 16, 7, 27, 20, 13, 2, 41, 52, 31, 37, 47, 55, 30, 40,
  51, 45, 33, 48, 44, 49, 39, 56, 34, 53, 46, 42, 50, 36, 29, 32,
];

const SHIFTS = [1, 1, 2, 2, 2, 2, 2, 2, 1, 2, 2, 2, 2, 2, 2, 1];

const SBOX = [
  [
    14, 4, 13, 1, 2, 15, 11, 8, 3, 10, 6, 12, 5, 9, 0, 7,
    0, 15, 7, 4, 14, 2, 13, 1, 10, 6, 12, 11, 9, 5, 3, 8,
    4, 1, 14, 8, 13, 6, 2, 11, 15, 12, 9, 7, 3, 10, 5, 0,
    15, 12, 8, 2, 4, 9, 1, 7, 5, 11, 3, 14, 10, 0, 6, 13,
  ],
  [
    15, 1, 8, 14, 6, 11, 3, 4, 9, 7, 2, 13, 12, 0, 5, 10,
    3, 13, 4, 7, 15, 2, 8, 14, 12, 0, 1, 10, 6, 9, 11, 5,
    0, 14, 7, 11, 10, 4, 13, 1, 5, 8, 12, 6, 9, 3, 2, 15,
    13, 8, 10, 1, 3, 15, 4, 2, 11, 6, 7, 12, 0, 5, 14, 9,
  ],
  [
    10, 0, 9, 14, 6, 3, 15, 5, 1, 13, 12, 7, 11, 4, 2, 8,
    13, 7, 0, 9, 3, 4, 6, 10, 2, 8, 5, 14, 12, 11, 15, 1,
    13, 6, 4, 9, 8, 15, 3, 0, 11, 1, 2, 12, 5, 10, 14, 7,
    1, 10, 13, 0, 6, 9, 8, 7, 4, 15, 14, 3, 11, 5, 2, 12,
  ],
  [
    7, 13, 14, 3, 0, 6, 9, 10, 1, 2, 8, 5, 11, 12, 4, 15,
    13, 8, 11, 5, 6, 15, 0, 3, 4, 7, 2, 12, 1, 10, 14, 9,
    10, 6, 9, 0, 12, 11, 7, 13, 15, 1, 3, 14, 5, 2, 8, 4,
    3, 15, 0, 6, 10, 1, 13, 8, 9, 4, 5, 11, 12, 7, 2, 14,
  ],
  [
    2, 12, 4, 1, 7, 10, 11, 6, 8, 5, 3, 15, 13, 0, 14, 9,
    14, 11, 2, 12, 4, 7, 13, 1, 5, 0, 15, 10, 3, 9, 8, 6,
    4, 2, 1, 11, 10, 13, 7, 8, 15, 9, 12, 5, 6, 3, 0, 14,
    11, 8, 12, 7, 1, 14, 2, 13, 6, 15, 0, 9, 10, 4, 5, 3,
  ],
  [
    12, 1, 10, 15, 9, 2, 6, 8, 0, 13, 3, 4, 14, 7, 5, 11,
    10, 15, 4, 2, 7, 12, 9, 5, 6, 1, 13, 14, 0, 11, 3, 8,
    9, 14, 15, 5, 2, 8, 12, 3, 7, 0, 4, 10, 1, 13, 11, 6,
    4, 3, 2, 12, 9, 5, 15, 10, 11, 14, 1, 7, 6, 0, 8, 13,
  ],
  [
    4, 11, 2, 14, 15, 0, 8, 13, 3, 12, 9, 7, 5, 10, 6, 1,
    13, 0, 11, 7, 4, 9, 1, 10, 14, 3, 5, 12, 2, 15, 8, 6,
    1, 4, 11, 13, 12, 3, 7, 14, 10, 15, 6, 8, 0, 5, 9, 2,
    6, 11, 13, 8, 1, 4, 10, 7, 9, 5, 0, 15, 14, 2, 3, 12,
  ],
  [
    13, 2, 8, 4, 6, 15, 11, 1, 10, 9, 3, 14, 5, 0, 12, 7,
    1, 15, 13, 8, 10, 3, 7, 4, 12, 5, 6, 11, 0, 14, 9, 2,
    7, 11, 4, 1, 9, 12, 14, 2, 0, 6, 10, 13, 15, 3, 5, 8,
    2, 1, 14, 7, 4, 10, 8, 13, 15, 12, 9, 0, 3, 5, 6, 11,
  ],
];

function getBit(bytes, bitIndex1Based) {
  const idx = bitIndex1Based - 1;
  return (bytes[idx >> 3] >> (7 - (idx & 7))) & 1;
}

function setBit(bytes, bitIndex1Based, val) {
  const idx = bitIndex1Based - 1;
  if (val) {
    bytes[idx >> 3] |= 1 << (7 - (idx & 7));
  } else {
    bytes[idx >> 3] &= ~(1 << (7 - (idx & 7)));
  }
}

function permute(input, table, outBytes) {
  const out = new Uint8Array(outBytes);
  for (let i = 0; i < table.length; i++) {
    setBit(out, i + 1, getBit(input, table[i]));
  }
  return out;
}

function generateSubkeys(keyBytes) {
  const permutedKey = permute(keyBytes, PC1, 7);
  let c = 0;
  let d = 0;
  for (let i = 0; i < 28; i++) {
    c = (c << 1) | getBit(permutedKey, i + 1);
    d = (d << 1) | getBit(permutedKey, i + 29);
  }
  const mask28 = 0x0fffffff;
  const subkeys = [];
  for (let round = 0; round < 16; round++) {
    const s = SHIFTS[round];
    c = ((c << s) | (c >>> (28 - s))) & mask28;
    d = ((d << s) | (d >>> (28 - s))) & mask28;
    const cd = new Uint8Array(7);
    for (let i = 0; i < 28; i++) {
      setBit(cd, i + 1, (c >>> (27 - i)) & 1);
      setBit(cd, i + 29, (d >>> (27 - i)) & 1);
    }
    subkeys.push(permute(cd, PC2, 6));
  }
  return subkeys;
}

function feistel(rBytes, subkeyBytes) {
  const expanded = permute(rBytes, E, 6);
  for (let i = 0; i < 6; i++) expanded[i] ^= subkeyBytes[i];

  const sOut = new Uint8Array(4);
  for (let box = 0; box < 8; box++) {
    const offset = box * 6;
    const b1 = getBit(expanded, offset + 1);
    const b2 = getBit(expanded, offset + 2);
    const b3 = getBit(expanded, offset + 3);
    const b4 = getBit(expanded, offset + 4);
    const b5 = getBit(expanded, offset + 5);
    const b6 = getBit(expanded, offset + 6);
    const row = (b1 << 1) | b6;
    const col = (b2 << 3) | (b3 << 2) | (b4 << 1) | b5;
    const val = SBOX[box][row * 16 + col];
    const outBitOffset = box * 4;
    for (let k = 0; k < 4; k++) {
      setBit(sOut, outBitOffset + k + 1, (val >>> (3 - k)) & 1);
    }
  }
  return permute(sOut, P, 4);
}

function decryptBlock(block8, subkeys) {
  const perm = permute(block8, IP, 8);
  let left = perm.slice(0, 4);
  let right = perm.slice(4, 8);

  for (let round = 15; round >= 0; round--) {
    const fOut = feistel(right, subkeys[round]);
    const nextRight = new Uint8Array(4);
    for (let i = 0; i < 4; i++) nextRight[i] = left[i] ^ fOut[i];
    left = right;
    right = nextRight;
  }

  const combined = new Uint8Array(8);
  combined.set(right, 0);
  combined.set(left, 4);
  return permute(combined, FP, 8);
}

export function decryptDesEcb(base64Ciphertext, keyStr = '38346591') {
  if (!base64Ciphertext || typeof base64Ciphertext !== 'string') return '';
  const cipher = Buffer.from(base64Ciphertext, 'base64');
  if (cipher.length === 0 || cipher.length % 8 !== 0) return '';

  const keyBytes = Uint8Array.from(Buffer.from(keyStr, 'utf8').subarray(0, 8));
  const subkeys = generateSubkeys(keyBytes);

  const plain = Buffer.alloc(cipher.length);
  for (let offset = 0; offset < cipher.length; offset += 8) {
    const block = Uint8Array.from(cipher.subarray(offset, offset + 8));
    const dec = decryptBlock(block, subkeys);
    Buffer.from(dec).copy(plain, offset);
  }

  // PKCS5/PKCS7 unpad
  const pad = plain[plain.length - 1];
  if (pad >= 1 && pad <= 8) {
    return plain.subarray(0, plain.length - pad).toString('utf8');
  }
  return plain.toString('utf8');
}
