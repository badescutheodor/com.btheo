import { NextRequest, NextResponse } from 'next/server';
import { User } from '@/lib/entities/User';
import { Upload } from '@/lib/entities/Upload';
import bcrypt from 'bcryptjs';
import { getDB } from '@/lib/db';
import EntityValidator from '@/lib/entities/EntityValidator';
import { QueryHandler, QueryOptions } from '@/lib/utils-server';
import { getSession } from '@/lib/auth';

export async function GET(req: NextRequest, res: NextResponse) {
  const user = await getSession(req);

  if (!user) {
    return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
  }

  const db = await getDB();
  const url = new URL(req.url);
  const queryHandler = new QueryHandler(db.getRepository(User));
  const options: QueryOptions<User> = {
    page: parseInt(url.searchParams.get('page') || '1', 10),
    limit: parseInt(url.searchParams.get('limit') || '10', 10),
    sort: url.searchParams.get('sort') || undefined,
    search: url.searchParams.get('search') || undefined,
    searchFields: ['name', 'email'],
    fields: url.searchParams.get('fields')?.split(',') || undefined,
  };

  queryHandler.setRoleFields('admin', [
    'id', 'name', 'email', 'role', 'avatar.path:avatar'
  ]);

  const result = await queryHandler.filterMulti(options, ['avatar'], user?.role);
  return NextResponse.json(result);
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
      avatar: userAvatar ? userAvatar : null
    });

    const errors = await EntityValidator.validate(newUser, User);
    
    if (Object.keys(errors).length > 0) {
      return NextResponse.json({ errors }, { status: 400 });
    }

    await userRepository.save(newUser);
    return NextResponse.json(newUser, { status: 201 });
}