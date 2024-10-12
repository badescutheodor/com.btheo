import { NextRequest, NextResponse } from 'next/server';
import { User } from '@/lib/entities/User';
import { Upload } from '@/lib/entities/Upload';
import bcrypt from 'bcryptjs';
import { getDB } from '@/lib/db';

export async function GET(req: NextRequest, res: NextResponse) {
  const db = await getDB();
  const userRepository = db.getRepository(User);
  const users = await userRepository.find({ relations: ['avatar'] });
  const formattedUsers = users.map(user => ({
    ...user,
    avatar: user.avatar ? { id: user.avatar.id, url: user.avatar.path } : null
  }));
  return NextResponse.json(formattedUsers);
}

export async function POST(req: NextRequest, res: NextResponse) {
    const db = await getDB();
    const userRepository = db.getRepository(User);
    const uploadRepository = db.getRepository(Upload);
    const reqBody = await req.json();
    const { name, email, password, role, avatar } = reqBody;
    const hashedPassword = await bcrypt.hash(password, 10);

    let userAvatar;
    if (avatar) {
      userAvatar = await uploadRepository.findOne({ where: { id: avatar.id } });
    }

    const newUser = userRepository.create({
      name,
      email,
      password: hashedPassword,
      role,
      avatar: userAvatar?.id,
    });

    const errors = await User.validate(newUser);
    
    if (errors.length > 0) {
      return NextResponse.json({ errors }, { status: 400 });
    }

    await userRepository.save(newUser);
    return NextResponse.json(newUser, { status: 201 });
}