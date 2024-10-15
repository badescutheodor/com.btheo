import { NextRequest, NextResponse } from 'next/server';
import { getRepository } from 'typeorm';
import { Label } from '@/lib/entities/Label';
import { getSession } from '@/lib/auth';
import { getDB } from '@/lib/db';

export async function GET(req: NextRequest) {
    const user = await getSession(req);

    if (!user) {
        return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    }

    const db = await getDB();

    try {
        const labelRepository = db.getRepository(Label);
        const labels = await labelRepository.find();
        return NextResponse.json(labels);
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

    const errors = await Label.validate(reqBody);
    
    if (Object.keys(errors).length > 0) {
      return NextResponse.json({ errors }, { status: 400 });
    }

    const db = await getDB();

    try {
        const labelRepository = db.getRepository(Label);
        let label = await labelRepository.findOne({ where: { name } });

        if (label) {
            return NextResponse.json({ message: 'Label already exists' }, { status: 400 });
        } else {
            label = labelRepository.create({ name, slug });
        }

        await labelRepository.save(label);
        return NextResponse.json(label);
    } catch (error) {
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
        const { id, name, slug } = await req.json();

        let label = await labelRepository.findOne({ where: { id } });

        if (!label) {
            return NextResponse.json({ message: 'Label not found' }, { status: 404 });
        }

        label.name = name;
        label.slug = slug;
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