import { compare, hash } from 'bcryptjs';
import { sign, verify } from 'jsonwebtoken';
import { User } from './entities/User';
import { getDB } from '@/lib/db';
import { NextRequest } from 'next/server';
import { cookies } from 'next/headers';

const JWT_SECRET = process.env.JWT_SECRET || 'secret';

export async function createUser(name: string, email: string, password: string, role: string = 'user') {
  const dataSource = await getDB();
  const userRepository = dataSource.getRepository(User);
  const hashedPassword = await hash(password, 10);
  const user = userRepository.create({ name, email, password: hashedPassword, role });
  await userRepository.save(user);
  return user;
}

export async function validateUser(email: string, password: string) {
  const dataSource = await getDB();
  const userRepository = dataSource.getRepository(User);
  const user = await userRepository.findOne({ where: { email } });
  if (user && await compare(password, user.password)) {
    return user;
  }
  return null;
}

export function generateToken(user: User) {
  return sign({ userId: user.id, email: user.email, role: user.role, name: user.name, avatar: user.avatar }, JWT_SECRET, { expiresIn: '1d' });
}

export function verifyToken(token: string) {
  try {
    return verify(token, JWT_SECRET) as { userId: number, email: string, role: string, avatar: Record<string, any>, name: string };
  } catch {
    return null;
  }
}

export async function getSession(req: NextRequest) {
  const token = cookies().get('token')?.value;
  if (!token) return null;
  return verifyToken(token as unknown as string);
}

