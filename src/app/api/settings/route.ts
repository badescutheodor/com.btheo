import { NextRequest, NextResponse } from 'next/server';
import { getRepository } from 'typeorm';
import { Setting } from '@/lib/entities/Setting';
import { getSession } from '@/lib/auth';
import { getDB } from '@/lib/db';

export async function GET(req: NextRequest) {
    const user = await getSession(req);

    if (!user) {
        return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    }

    const db = await getDB();

    try {
        const settingRepository = db.getRepository(Setting);
        const settings = await settingRepository.find();
    return NextResponse.json(settings);
    } catch (error) {
        return NextResponse.json({ message: 'Error fetching settings' }, { status: 500 });
    }
}

export async function POST(req: NextRequest) {
    const user = await getSession(req);

    if (!user) {
        return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    }

    const db = await getDB();

    try {
        const settingRepository = db.getRepository(Setting);
        const reqBody = await req.json();
        const { key, value } = reqBody;
        const errors = await Setting.validate(reqBody);
        
        if (errors.length > 0) {
          return NextResponse.json({ errors }, { status: 400 });
        }

        let setting = await settingRepository.findOne({ where: { key } });

        if (setting) {
            setting.value = value;
        } else {
            setting = settingRepository.create({ key, value });
        }

        await settingRepository.save(setting);
        return NextResponse.json(setting);
    } catch (error) {
        return NextResponse.json({ message: 'Error saving setting' }, { status: 500 });
    }
}

export async function PUT(req: NextRequest) {
    const user = await getSession(req);

    if (!user) {
        return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    }

    const db = await getDB();

    try {
      const settingRepository = db.getRepository(Setting);
      const reqBody = await req.json();
      const { key, value } = reqBody;
  
      let setting = await settingRepository.findOne({ where: { key } });
      
      if (!setting) {
        return NextResponse.json({ message: 'Setting not found' }, { status: 404 });
      }
      
      setting.value = value;

      const errors = await Setting.validate(setting);
      
      if (errors.length > 0) {
        return NextResponse.json({ errors }, { status: 400 });
      }

      await settingRepository.save(setting);
      return NextResponse.json(setting);
    } catch (error) {
      return NextResponse.json({ message: 'Error updating setting' }, { status: 500 });
    }
  }

export async function OPTIONS(req: NextRequest) {
  return new NextResponse(null, {
    status: 204,
    headers: {
      'Allow': 'GET, POST, PUT'
    }
  });
}