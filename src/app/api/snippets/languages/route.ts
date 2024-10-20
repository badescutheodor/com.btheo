import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import { getDB } from '@/lib/db';
import { Snippet } from '@/lib/entities/Snippet';

export async function GET(req: NextRequest) {
    try {
      const user = await getSession(req);

      if (!user) {
        return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
      }
  
      const db = await getDB();
      const snippetRepository = db.getRepository(Snippet);

      const result = await snippetRepository
      .createQueryBuilder('snippet')
      .select('DISTINCT snippet.language', 'language')
      .getRawMany();

      const languages = result.map(item => item.language);
      return NextResponse.json(languages);
    } catch (error) {
      console.log(error);
      return NextResponse.json({ message: 'Error fetching languages' }, { status: 500 });
    }
}

export async function OPTIONS(req: NextRequest) {
  return new NextResponse(null, {
    status: 204,
    headers: {
      'Allow': 'GET'
    }
  });
}