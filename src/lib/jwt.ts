import { JWT, JWTDecodeParams } from 'next-auth/jwt';
import * as jose from 'jose';

const encodedSecret = new TextEncoder().encode(process.env.JWT_SECRET);

const encode = async (params: any): Promise<string> => {
  const signedToken = await new jose.SignJWT(params)
    .setProtectedHeader({ alg: 'HS256' })
    .setExpirationTime('24h')
    .sign(encodedSecret);

  if (!signedToken) {
    throw new Error('Failed to sign token');
  }
  
  return signedToken;
};

const decode = async (params: JWTDecodeParams): Promise<JWT | null> => {
  if (!params.token) {
    throw new Error('Failed to verify token');
  }

  let token = params.token;

  if (params.token.startsWith('Bearer')) {
    token = params.token.replace('Bearer ', '');
  }

  try {
    const decoded = await jose.jwtVerify(token, encodedSecret);

    if (!decoded.payload) {
      throw new Error('Failed to verify token');
    }

    return decoded.payload;
  } catch (error) {
    console.log(error);
    throw new Error(`${error}`);
  }
};

export const jwtConfig = {
  encode,
  decode,
};

export default jwtConfig;