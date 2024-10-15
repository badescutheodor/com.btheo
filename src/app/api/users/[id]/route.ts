import { NextRequest, NextResponse } from 'next/server';
import { User } from '@/lib/entities/User';
import { Upload } from '@/lib/entities/Upload';
import bcrypt from 'bcryptjs';
import { getDB } from '@/lib/db';

export async function PUT(req: NextRequest, { params }: any) {
  const db = await getDB();
  const userRepository = db.getRepository(User);
  const uploadRepository = db.getRepository(Upload);
  const id: number = Number(params.id);
  const user = await userRepository.findOne({ 
    where: { id },
    relations: ['avatar'] 
});

  if (!user) {
    return NextResponse.json({ message: 'User not found' }, { status: 404 });
  }

  const { name, email, password, role, avatar } = await req.json();
  user.name = name;
  user.email = email;
  user.role = role;
  user.password = await bcrypt.hash(password, 10);

  if (avatar) {
    const newAvatar = await uploadRepository.findOne({ where: { id: avatar.id } });
    if (!newAvatar) {
      return NextResponse.json({ message: 'Invalid avatar ID' }, { status: 400 });
    }
    user.avatar = newAvatar;
  }

  if (password) {
    user.password = await bcrypt.hash(password, 10);
  }

  const errors = await User.validate(user);
    
  if (Object.keys(errors).length > 0) {
    return NextResponse.json({ errors }, { status: 400 });
  }

  await userRepository.save(user);
  return NextResponse.json(user);
}

export async function DELETE(req: NextRequest, { params }: any) {
    const db = await getDB();
    const userRepository = db.getRepository(User);
    const id: number = Number(params.id);
    const user = await userRepository.findOne({ 
        where: { id },
        relations: ['avatar'] 
    });
    if (!user) {
      return NextResponse.json({ message: 'User not found' }, { status: 404 });
    }
  
    await userRepository.remove(user);
    return NextResponse.json({ message: 'User deleted' });
}