import { NextRequest, NextResponse } from 'next/server';
import path from 'path';
import { Upload } from '@/lib/entities/Upload';
import { getDB } from '@/lib/db';
import { getSession } from '@/lib/auth';
import { writeFile } from 'fs/promises';
import { User } from '@/lib/entities/User';

export async function POST(req: NextRequest) {
  const user = await getSession(req);

  if (!user) {
    return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
  }

  const db = await getDB();

  try {
    const formData = await req.formData();
    const file = formData.get('file') as File;
    const type = formData.get('type') as string;

    if (!file) {
      return NextResponse.json({ message: 'No file uploaded' }, { status: 400 });
    }

    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);

    const fileName = file.name;
    const ext = fileName.split('.').pop();
    const uniqueName = `${Date.now()}.${ext}`;
    const filePath = path.join(process.cwd(), 'public', 'uploads', uniqueName);

    await writeFile(filePath, buffer);

    const uploadRepository = db.getRepository(Upload);
    const upload = {
      filename: fileName,
      user: { id: user.id } as User,
      path: `/uploads/${uniqueName}`,
      type,
      createdAt: new Date()
    };

    const newUpload = uploadRepository.create(upload);
    const errors = await Upload.validate(newUpload);
    
    if (errors.length > 0) {
      return NextResponse.json({ errors }, { status: 400 });
    }

    await uploadRepository.save(newUpload);

    return NextResponse.json(newUpload);
  } catch (error) {
    console.error('Error uploading file:', error);
    return NextResponse.json({ message: 'Error uploading file' }, { status: 500 });
  }
}