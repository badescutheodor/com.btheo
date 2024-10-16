import { getDB } from '@/lib/db';
import { BlogPost } from '@/lib/entities/BlogPost';
import { Comment } from '@/lib/entities/Comment';
import { markdown } from '@/lib/markdown';
import { QueryHandler } from '@/lib/utils-server';

interface GetBlogPostsOptions {
  page?: number;
  label?: Record<string, any>;
  search?: string;
}

function extractFirstImage(content: string): string | null {
  const imgRegex = /<img.*?src=["'](.*?)["']/;
  const match = content.match(imgRegex);
  return match ? match[1] : null;
}

export async function getFeaturedPosts(limit: number) {
  const db = await getDB();
  const blogPostRepository = db.getRepository(BlogPost);

  const posts = await blogPostRepository.find({
    where: { isFeatured: true },
    relations: ['author'],
    order: { date: 'DESC' },
    take: limit,
  });

  return posts.map(post => ({
    id: post.id,
    title: post.title,
    slug: post.slug,
    content: post.content,
    author: {
      name: post.author.name,
    },
    previewImage: extractFirstImage(post.content),
  }));
}

export async function getRelatedPosts(postId: number, labelIds: number[], limit: number = 4) {
  const db = await getDB();
  const blogPostRepository = db.getRepository(BlogPost);

  const relatedPosts = await blogPostRepository
    .createQueryBuilder('post')
    .innerJoinAndSelect('post.labels', 'labels')
    .innerJoinAndSelect('post.author', 'author')
    .where('post.id != :postId', { postId })
    .andWhere('labels.id IN (:...labelIds)', { labelIds })
    .orderBy('RANDOM()')
    .take(limit)
    .getMany();

  return relatedPosts.map(post => ({
    id: post.id,
    title: post.title,
    slug: post.slug,
    author: {
      name: post.author.name,
    },
    labels: post.labels.map(label => label ? {...label} : {}),
    previewImage: extractFirstImage(post.content),
  }));
}

export async function getBlogPosts({
  page = 1,
  label,
  search,
}: GetBlogPostsOptions) {
  const db = await getDB();
  const blogPostRepository = db.getRepository(BlogPost);
  const queryHandler = new QueryHandler(blogPostRepository);
  queryHandler.setRoleFields('public', ['id', 'content', 'excerpt', 'author.avatar.filename', 'labels.name', 'labels.slug', 'metaTags']);
  const posts = await queryHandler.filterMulti({
    page,
    limit: 10,
  }, ['author.avatar', 'labels'], 'public');

  return {
    data: posts.data.map(post => ({
      ...post,
      imagePreview: extractFirstImage(post.content),
    })),
    meta: posts.meta,
  }
}

export async function getBlogPostBySlug(slug: string) {
  const db = await getDB();
  const blogPostRepository = db.getRepository(BlogPost);
  const commentRepository = db.getRepository(Comment);

  const post = await blogPostRepository.findOne({
    where: { slug },
    relations: ['labels', 'author'],
    select: {
        author: {
            name: true,
            avatar: true,
        }
    }
  });

  if (!post) {
    return null;
  }

  const comments = await commentRepository.find({
    where: { post: { id: post.id } },
    order: { createdAt: 'DESC' },
  });

  return {
    id: post.id,
    title: post.title,
    content: markdown.render(post.content),
    excerpt: post.excerpt,
    readTime: post.readTime,
    date: post.createdAt.toISOString(),
    author: post.author,
    views: post.views,
    isFeatured: post.isFeatured,
    slug: post.slug,
    labels: post.labels.map(label => label ? {...label} : {}),
    comments: comments.map(comment => ({
      id: comment.id,
      name: comment.name,
      content: comment.content,
      createdAt: comment.createdAt.toISOString(),
    })),
  };
}

export async function getLabels() {
  const db = await getDB();
  const blogPostRepository = db.getRepository(BlogPost);

  const labels = await blogPostRepository
    .createQueryBuilder('posts')
    .leftJoin('posts.labels', 'label') // Join the labels relation
    .select('DISTINCT label.name', 'name') // Select distinct label names
    .getRawMany();

  return labels.map(label => label); 
}

export async function getTotalBlogPostsCount(slug?: string) {
  const db = await getDB();
  const blogPostRepository = db.getRepository(BlogPost);

  const queryBuilder = blogPostRepository.createQueryBuilder('posts')
    .leftJoin('posts.labels', 'labels');

  if (slug) {
    queryBuilder.where('labels.slug = :slug', { slug });
  }

  return await queryBuilder.getCount();
}

export async function createComment({ name, content, postId }: { name: string; content: string; postId: number }) {
  const db = await getDB();
  const commentRepository = db.getRepository(Comment);
  const blogPostRepository = db.getRepository(BlogPost);

  const post = await blogPostRepository.findOne({ where: { id: postId } });

  if (!post) {
    throw new Error('Blog post not found');
  }

  const comment = commentRepository.create({
    name,
    content,
    post,
  });

  await commentRepository.save(comment);

  return {
    id: comment.id,
    name: comment.name,
    content: comment.content,
    createdAt: comment.createdAt.toISOString()
  };
}