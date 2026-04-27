import * as jose from 'jose';

const JWT_SECRET = process.env.JWT_SECRET || 'super-secret-key-for-dev';

export async function verifyGuestToken(token: string) {
  try {
    const secret = new TextEncoder().encode(JWT_SECRET);
    const { payload } = await jose.jwtVerify(token, secret);
    return payload as { propertyId: string; floorId: string; floorNumber: number };
  } catch (error) {
    console.error('Invalid token', error);
    return null;
  }
}

export async function createGuestToken(propertyId: string, floorId: string, floorNumber: number) {
  const secret = new TextEncoder().encode(JWT_SECRET);
  const jwt = await new jose.SignJWT({ propertyId, floorId, floorNumber })
    .setProtectedHeader({ alg: 'HS256' })
    .setExpirationTime('1y')
    .sign(secret);
  return jwt;
}
