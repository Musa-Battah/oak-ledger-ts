// This file is for EDGE-COMPATIBLE operations (middleware)
// Only import functions that use jose, NOT bcrypt

import { jwtVerify } from 'jose';
import { TokenPayload } from './auth';

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-in-production';

function getSecretKey(): Uint8Array {
  return new TextEncoder().encode(JWT_SECRET);
}

// Verify JWT token - Edge compatible (no bcrypt)
export async function verifyTokenEdge(token: string): Promise<TokenPayload | null> {
  try {
    const { payload } = await jwtVerify(token, getSecretKey());
    return payload as TokenPayload;
  } catch {
    return null;
  }
}