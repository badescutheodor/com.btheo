import { compare, hash } from 'bcryptjs';
import { User } from './entities/User';
import { getDB } from '@/lib/db';
import { NextRequest } from 'next/server';
import { cookies } from 'next/headers';
import jwt from './jwt';

const JWT_SECRET = process.env.JWT_SECRET || 'secret';

export async function createUser(name: string, email: string, password: string, role: string = 'user') {
  const dataSource = await getDB();
  const userRepository = dataSource.getRepository(User);
  const hashedPassword = await hash(password, 10);
  const user = userRepository.create({ name, email, password: hashedPassword, role });
  await userRepository.save(user);
  return user;
}

export async function getUserById(id: number) {
  const dataSource = await getDB();
  const userRepository = dataSource.getRepository(User);
  const user = await userRepository.findOne({
    where: {
      id
    },
    relations: ['avatar'] 
  });

  user.avatar = user.avatar ? user.avatar.path : null;
  return user;
}

export async function validateUser(email: string, password: string) {
  const dataSource = await getDB();
  const userRepository = dataSource.getRepository(User);
  const user = await userRepository.findOne({
     where: { email },  
  });
  console.log(user);

  if (user && await compare(password, user.password)) {
    // @ts-ignore
    //delete user.password;
    return user;
  }
  return null;
}

export async function generateToken(user: User) {
  return await jwt.encode({
    ...user
  });
}

export async function verifyToken(token: string) {
  try {
    return await jwt.decode({ token, secret: JWT_SECRET });
  } catch {
    return null;
  }
}

export async function getSession(req: NextRequest) {
  const token = cookies().get('token')?.value;
  if (!token) return null;
  return verifyToken(token as unknown as string);
}

