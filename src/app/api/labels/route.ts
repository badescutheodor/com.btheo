import { NextRequest, NextResponse } from 'next/server';
import { Label } from '@/lib/entities/Label';
import { getSession } from '@/lib/auth';
import { getDB } from '@/lib/db';
import EntityValidator from '@/lib/entities/EntityValidator';
import { QueryHandler, QueryOptions } from '@/lib/utils-server';

export async function GET(req: NextRequest) {
    const user = await getSession(req);

    if (!user) {
        return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    }

    const db = await getDB();

    try {
        const url = new URL(req.url);
        const queryHandler = new QueryHandler(db.getRepository(Label));
        const options: QueryOptions = {
            page: parseInt(url.searchParams.get('page') || '1', 10),
            limit: parseInt(url.searchParams.get('limit') || '10', 10),
            sort: url.searchParams.get('sort') || undefined,
            search: url.searchParams.get('search') || undefined,
            searchFields: ['name', 'slug'],
        }

        queryHandler.setRoleFields('admin', ['id', 'name', 'slug']);
        const result = await queryHandler.filterMulti(options, [], user?.role);
        return NextResponse.json(result);
    } catch (error) {
        return NextResponse.json({ message: 'Error fetching labels' }, { status: 500 });
    }
}

export async function POST(req: NextRequest) {
    const user = await getSession(req);

    if (!user) {
        return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    }

    const reqBody = await req.json();
    const { name, slug } = reqBody;

    const errors = await EntityValidator.validate(reqBody, Label);
    
    if (Object.keys(errors).length > 0) {
      return NextResponse.json({ errors }, { status: 400 });
    }

    const db = await getDB();

    try {
        const labelRepository = db.getRepository(Label);
        let label = await labelRepository.findOne({ where: [
            { name },
            { slug }
        ] });

        if (label) {
            return NextResponse.json({ message: 'Label or slug already in use' }, { status: 400 });
        } else {
            label = labelRepository.create({ name, slug });
        }

        await labelRepository.save(label);
        return NextResponse.json(label);
    } catch (error) {
        console.log(error);
        return NextResponse.json({ message: 'Error creating label' }, { status: 500 });
    }
}

export async function PUT(req: NextRequest) {
    const user = await getSession(req);

    if (!user) {
        return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    }

    const db = await getDB();

    try {
        const labelRepository = db.getRepository(Label);
        const reqBody = await req.json();
        const { id, name, slug } = reqBody;

        let label = await labelRepository.findOne({ where: { id } });

        if (!label) {
            return NextResponse.json({ message: 'Label not found' }, { status: 404 });
        }

        label = labelRepository.merge(label, reqBody);
        const errors = await EntityValidator.validate(label, Label);

        if (Object.keys(errors).length > 0) {
            return NextResponse.json({ errors }, { status: 400 });
        }

        await labelRepository.save(label);
        return NextResponse.json(label);
    } catch (error) {
        return NextResponse.json({ message: 'Error updating label' }, { status: 500 });
    }
}

export async function DELETE(req: NextRequest) {
    const user = await getSession(req);

    if (!user) {
        return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    }

    const db = await getDB();

    try {
        const labelRepository = db.getRepository(Label);
        const { id } = await req.json();

        let label = await labelRepository.findOne({ where: { id } });

        if (!label) {
            return NextResponse.json({ message: 'Label not found' }, { status: 404 });
        }

        await labelRepository.remove(label);
        return NextResponse.json({ message: 'Label deleted successfully' });
    } catch (error) {
        return NextResponse.json({ message: 'Error deleting label' }, { status: 500 });
    }
}

export async function OPTIONS(req: NextRequest) {
  return new NextResponse(null, {
    status: 204,
    headers: {
      'Allow': 'GET, POST, PUT, DELETE'
    }
  });
}