import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import { getDB } from '@/lib/db';
import { Snippet } from '@/lib/entities/Snippet';
import { Label } from '@/lib/entities/Label';

export async function GET(req: NextRequest) {
    try {
      const user = await getSession(req);

      if (!user) {
        return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
      }
  
      const db = await getDB();
      const snippetRepository = db.getRepository(Snippet);
      const snippets = await snippetRepository.find({
        relations: ['author', 'labels'],
      });
  
      return NextResponse.json(snippets);
    } catch (error) {
      return NextResponse.json({ message: 'Error fetching snippets' }, { status: 500 });
    }
}
  
export async function POST(req: NextRequest) {
    try {
        const user = await getSession(req);
        
        if (!user) {
            return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
        }

        const db = await getDB();
        const snippetRepository = db.getRepository(Snippet);
        const labelRepository = db.getRepository(Label);
        const reqBody = await req.json();
        const { title, content, language, isFeatured, labelIds } = reqBody;
        const errors = await Snippet.validate(reqBody);
        
        if (Object.keys(errors).length > 0) {
          return NextResponse.json({ errors }, { status: 400 });
        }

        const labels = await labelRepository.findByIds(labelIds);

        const snippet = snippetRepository.create({
            title,
            content,
            language,
            isFeatured,
            author: { id: user.userId },
            labels,
        });

        await snippetRepository.save(snippet);
        return NextResponse.json(snippet);
    } catch (error) {
        return NextResponse.json({ message: 'Error creating snippet' }, { status: 500 });
    }
}

export async function PUT(req: NextRequest) {
    try {
      const user = await getSession(req);
      if (!user) {
        return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
      }
  
      const db = await getDB();
      const snippetRepository = db.getRepository(Snippet);
      const labelRepository = db.getRepository(Label);
  
      const { id, title, content, language, isFeatured, labelIds } = await req.json();
  
      const snippet = await snippetRepository.findOne({
        where: { id },
        relations: ['author', 'labels'],
      });
  
      if (!snippet) {
        return NextResponse.json({ message: 'Snippet not found' }, { status: 404 });
      }
  
      if (snippet.author.id !== user.id && user.role !== 'admin') {
        return NextResponse.json({ message: 'Unauthorized' }, { status: 403 });
      }
  
      const labels = await labelRepository.findByIds(labelIds);
  
      snippet.title = title;
      snippet.content = content;
      snippet.language = language;
      snippet.isFeatured = isFeatured;
      snippet.labels = labels;
      
      const errors = await Snippet.validate(snippet);
      
      if (Object.keys(errors).length > 0) {
        return NextResponse.json({ errors }, { status: 400 });
      }
  
      await snippetRepository.save(snippet);
      return NextResponse.json(snippet);
    } catch (error) {
      return NextResponse.json({ message: 'Error updating snippet' }, { status: 500 });
    }
}

export async function DELETE(req: NextRequest) {
  try {
    const user = await getSession(req);
    if (!user) {
      return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    }

    const db = await getDB();
    const snippetRepository = db.getRepository(Snippet);

    const { id } = await req.json();

    const snippet = await snippetRepository.findOne({
      where: { id },
      relations: ['author'],
    });

    if (!snippet) {
      return NextResponse.json({ message: 'Snippet not found' }, { status: 404 });
    }

    if (snippet.author.id !== user.id && user.role !== 'admin') {
      return NextResponse.json({ message: 'Unauthorized' }, { status: 403 });
    }

    await snippetRepository.remove(snippet);
    return NextResponse.json({ message: 'Snippet deleted successfully' });
  } catch (error) {
    return NextResponse.json({ message: 'Error deleting snippet' }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest) {
    try {
      const user = await getSession(req);
      
      if (!user) {
        return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
      }
  
      const db = await getDB();
      const snippetRepository = db.getRepository(Snippet);
  
      const languages = await snippetRepository
        .createQueryBuilder('snippet')
        .select('DISTINCT snippet.language', 'language')
        .getRawMany();
  
      return NextResponse.json(languages.map(l => l.language));
    } catch (error) {
      return NextResponse.json({ message: 'Error fetching languages' }, { status: 500 });
    }
  }

export async function OPTIONS(req: NextRequest) {
  return new NextResponse(null, {
    status: 204,
    headers: {
      'Allow': 'GET, POST, PUT, DELETE, PATCH'
    }
  });
}