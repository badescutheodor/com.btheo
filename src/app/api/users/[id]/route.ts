import { NextRequest, NextResponse } from 'next/server';
import { User } from '@/lib/entities/User';
import { Upload } from '@/lib/entities/Upload';
import bcrypt from 'bcryptjs';
import { getDB } from '@/lib/db';
import EntityValidator from '@/lib/entities/EntityValidator';
import { getSession } from '@/lib/auth';

export async function PUT(req: NextRequest, { params }: any) {
  const user = await getSession(req);

  if (!user) {
    return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
  }

  const db = await getDB();
  const userRepository = db.getRepository(User);
  const uploadRepository = db.getRepository(Upload);
  const id: number = Number(params.id);
  let entity = await userRepository.findOne({ where: { id }, relations: ['avatar'] });

  if (!entity) {
    return NextResponse.json({ message: 'User not found' }, { status: 404 });
  }

  const reqBody = await req.json();
  const { name, email, password, role, avatar } = reqBody;

  if (avatar) {
    const newAvatar = await uploadRepository.findOne({ where: { id: avatar.id } });
    if (!newAvatar) {
      return NextResponse.json({ message: 'Invalid avatar ID' }, { status: 400 });
    }
    user.avatar = newAvatar;
  }

  if (reqBody.password) {
    reqBody.password = await bcrypt.hash(password, 10);
  }

  entity = userRepository.merge(entity, reqBody);
  const errors = await EntityValidator.validate(entity, User);
    
  if (Object.keys(errors).length > 0) {
    return NextResponse.json({ errors }, { status: 400 });
  }

  await userRepository.save(entity);
  entity.avatar = entity.avatar ? entity.avatar.path : null;
  return NextResponse.json(entity);
}

export async function DELETE(req: NextRequest, { params }: any) {
    const user = await getSession(req);

    if (!user) {
      return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    }

    const db = await getDB();
    const userRepository = db.getRepository(User);
    const id: number = Number(params.id);
    const entity = await userRepository.findOne({ 
        where: { id },
        relations: ['avatar'] 
    });

    if (!entity) {
      return NextResponse.json({ message: 'User not found' }, { status: 404 });
    }
  
    await userRepository.remove(entity);
    return NextResponse.json({ message: 'User deleted' });
}