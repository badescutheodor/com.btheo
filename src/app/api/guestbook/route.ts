import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import { getDB } from '@/lib/db';
import { GuestbookEntry } from '@/lib/entities/GuestbookEntry';

export async function GET(req: NextRequest) {
  try {
    const db = await getDB();
    const guestbookRepository = db.getRepository(GuestbookEntry);
    const entries = await guestbookRepository.find({
      order: { createdAt: 'DESC' },
    });

    return NextResponse.json(entries);
  } catch (error) {
    return NextResponse.json({ message: 'Error fetching guestbook entries' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const reqBody = await req.json();
    const { name, email, message, location } = reqBody;

    const errors = await GuestbookEntry.validate(reqBody);
    
    if (errors.length > 0) {
      return NextResponse.json({ errors }, { status: 400 });
    }

    const db = await getDB();
    const guestbookRepository = db.getRepository(GuestbookEntry);

    const newEntry = guestbookRepository.create({
      name,
      email,
      message,
      location,
      ipAddress: req.ip,
      userAgent: req.headers.get('user-agent') || undefined,
    });

    await guestbookRepository.save(newEntry);
    return NextResponse.json(newEntry);
  } catch (error) {
    return NextResponse.json({ message: 'Error creating guestbook entry' }, { status: 500 });
  }
}

export async function PUT(req: NextRequest) {
  try {
    const user = await getSession(req);
    if (!user || user.role !== 'admin') {
      return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    }

    const db = await getDB();
    const guestbookRepository = db.getRepository(GuestbookEntry);

    const reqBody = await req.json();
    const { id, isApproved } = reqBody;

    const entry = await guestbookRepository.findOne({ where: { id } });

    if (!entry) {
      return NextResponse.json({ message: 'Guestbook entry not found' }, { status: 404 });
    }

    entry.isApproved = isApproved;
    const errors = await GuestbookEntry.validate(entry);
    
    if (errors.length > 0) {
      return NextResponse.json({ errors }, { status: 400 });
    }

    await guestbookRepository.save(entry);
    return NextResponse.json(entry);
  } catch (error) {
    return NextResponse.json({ message: 'Error updating guestbook entry' }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const user = await getSession(req);
    if (!user || user.role !== 'admin') {
      return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    }

    const db = await getDB();
    const guestbookRepository = db.getRepository(GuestbookEntry);

    const { id } = await req.json();

    const entry = await guestbookRepository.findOne({ where: { id } });

    if (!entry) {
      return NextResponse.json({ message: 'Guestbook entry not found' }, { status: 404 });
    }

    await guestbookRepository.remove(entry);
    return NextResponse.json({ message: 'Guestbook entry deleted successfully' });
  } catch (error) {
    return NextResponse.json({ message: 'Error deleting guestbook entry' }, { status: 500 });
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