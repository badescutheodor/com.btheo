import { NextRequest, NextResponse } from 'next/server';
import { Setting } from '@/lib/entities/Setting';
import { getSession } from '@/lib/auth';
import { getDB } from '@/lib/db';
import { QueryHandler, QueryOptions } from '@/lib/utils-server';
import EntityValidator from '@/lib/entities/EntityValidator';

export async function GET(req: NextRequest) {
    const user = await getSession(req);
    const url = new URL(req.url);

    if (!user) {
        return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    }

    const db = await getDB();

    try {
        const queryHandler = new QueryHandler(db.getRepository(Setting));
        queryHandler.setRoleFields('admin', ['id', 'key', 'value']);
        const options: QueryOptions = {
          page: parseInt(url.searchParams.get('page') || '1', 10),
          limit: parseInt(url.searchParams.get('limit') || '10', 10),
          sort: url.searchParams.get('sort') || undefined,
          search: url.searchParams.get('search') || undefined,
          searchFields: ['key', 'value'],
        };

        const result = await queryHandler.filterMulti(options, [], user?.role);
        return NextResponse.json(result);
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
        const errors = await EntityValidator.validate(reqBody, Setting);

        if (Object.keys(errors).length > 0) {
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

    const errors = await EntityValidator.validate(setting, Setting);
    
    if (Object.keys(errors).length > 0) {
      return NextResponse.json({ errors }, { status: 400 });
    }

    await settingRepository.save(setting);
    return NextResponse.json(setting);
  } catch (error) {
    return NextResponse.json({ message: 'Error updating setting' }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {

}

export async function OPTIONS(req: NextRequest) {
  return new NextResponse(null, {
    status: 204,
    headers: {
      'Allow': 'GET, POST, PUT, DELETE'
    }
  });
}