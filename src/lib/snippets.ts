import { getDB } from '@/lib/db';
import { Snippet } from '@/lib/entities/Snippet';
import { Label } from '@/lib/entities/Label';

interface GetSnippetsOptions {
  page?: number;
  language?: string;
  label?: string;
}

export async function getSnippets({
  page = 1,
  language,
  label,
}: GetSnippetsOptions) {
  const db = await getDB();
  const snippetRepository = db.getRepository(Snippet);

  const queryBuilder = snippetRepository
    .createQueryBuilder('snippet')
    .leftJoinAndSelect('snippet.labels', 'label')
    .skip((page - 1) * 10)
    .take(10);

  if (language) {
    queryBuilder.andWhere('snippet.language = :language', { language });
  }

  if (label) {
    queryBuilder.andWhere('label.name = :label', { label });
  }

  const snippets = await queryBuilder.getMany();

  return snippets.map(snippet => ({
    id: snippet.id,
    title: snippet.title,
    code: snippet.content,
    language: snippet.language,
    labels: snippet.labels.map(label => label.name),
  }));
}

export async function getLanguages() {
  const db = await getDB();
  const snippetRepository = db.getRepository(Snippet);

  const languages = await snippetRepository
    .createQueryBuilder('snippet')
    .select('DISTINCT snippet.language', 'language')
    .getRawMany();

  return languages.map(l => l.language);
}

export async function getLabels() {
  const db = await getDB();
  const labelRepository = db.getRepository(Label);

  const labels = await labelRepository.find();

  return labels.map(label => label.name);
}

export async function getTotalSnippetsCount(language?: string, label?: string) {
  const db = await getDB();
  const snippetRepository = db.getRepository(Snippet);

  const queryBuilder = snippetRepository.createQueryBuilder('snippet')
    .leftJoin('snippet.labels', 'label');

  if (language) {
    queryBuilder.andWhere('snippet.language = :language', { language });
  }

  if (label) {
    queryBuilder.andWhere('label.name = :label', { label });
  }

  return await queryBuilder.getCount();
}