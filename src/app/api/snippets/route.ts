import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import { getDB } from '@/lib/db';
import { Snippet } from '@/lib/entities/Snippet';
import { Label } from '@/lib/entities/Label';
import EntityValidator from '@/lib/entities/EntityValidator';
import { QueryHandler, QueryOptions } from '@/lib/utils-server';

export async function GET(req: NextRequest) {
    try {
      const user = await getSession(req);

      if (!user) {
        return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
      }
  
      const db = await getDB();
      const url = new URL(req.url);
      const snippetRepository = db.getRepository(Snippet);
      const queryHandler = new QueryHandler(snippetRepository);


      const options: QueryOptions = {
        page: url.searchParams.get('page'),
        limit: url.searchParams.get('limit'),
        search: url.searchParams.get('search'),
        searchFields: ['title', 'content', 'language', 'labels.name'],
        sort: url.searchParams.get('sort')
      };

      queryHandler.setRoleFields('admin', [
        'id',
        'title',
        'content',
        'author.name:author',
        'language',
        'isFeatured',
      ]);

      const result = await queryHandler.filterMulti(options, ['labels', 'author'], user?.role);
      return NextResponse.json(result);
    } catch (error) {
      console.log(error);
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
        const { title, content, language, isFeatured, labels: labelIds } = reqBody;
        const errors = await EntityValidator.validate(reqBody, Snippet);
        
        if (Object.keys(errors).length > 0) {
          return NextResponse.json({ errors }, { status: 400 });
        }

        const labels = await labelRepository.findByIds(labelIds.map((label: any) => label.id));

        const snippet = snippetRepository.create({
            title,
            content,
            language,
            isFeatured,
            author: { id: user.id },
            labels,
        });

        await snippetRepository.save(snippet);
        return NextResponse.json(snippet);
    } catch (error) {
      console.log(error);
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
  
      const reqBody = await req.json();
      let { id, title, content, language, isFeatured, labels: labelIds } = reqBody;
  
      let snippet = await snippetRepository.findOne({
        where: { id },
        relations: ['author', 'labels'],
      });

      if (!snippet) {
        return NextResponse.json({ message: 'Snippet not found' }, { status: 404 });
      }
  
      if (snippet.author.id !== user.id && user.role !== 'admin') {
        return NextResponse.json({ message: 'Unauthorized' }, { status: 403 });
      }
      
      if (labelIds) {
        reqBody.labels = await labelRepository.findByIds(labelIds.map((label: any) => label.id));
      }  

      snippet = snippetRepository.merge(snippet, reqBody);
  
      const errors = await EntityValidator.validate(snippet, Snippet);
      
      if (Object.keys(errors).length > 0) {
        return NextResponse.json({ errors }, { status: 400 });
      }
  
      await snippetRepository.save(snippet);
      return NextResponse.json(snippet);
    } catch (error) {
      console.log(error);
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