import { NextRequest, NextResponse } from 'next/server';
import { getDB } from '@/lib/db';
import { Comment } from '@/lib/entities/Comment';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const postId = searchParams.get('postId');

    if (!postId) {
      return NextResponse.json({ message: 'Post ID is required' }, { status: 400 });
    }

    const db = await getDB();
    const commentRepository = db.getRepository(Comment);

    const comments = await commentRepository.find({
      where: { post: { id: parseInt(postId) } },
      order: { createdAt: 'DESC' },
    });

    return NextResponse.json(comments);
  } catch (error) {
    console.error('Error fetching comments:', error);
    return NextResponse.json({ message: 'Error fetching comments' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const reqBody = await req.json();
    const { postId, content, name, email, website } = reqBody;

    const errors = await Comment.validate(reqBody);
    
    if (errors.length > 0) {
      return NextResponse.json({ errors }, { status: 400 });
    }

    if (!postId || !content) {
      return NextResponse.json({ message: 'Post ID and content are required' }, { status: 400 });
    }

    const db = await getDB();
    const commentRepository = db.getRepository(Comment);

    const newComment = commentRepository.create({
      name,
      content,
      post: { id: postId },
      email,
      website
    });

    await commentRepository.save(newComment);

    // Fetch the saved comment with author details
    const savedComment = await commentRepository.findOne({
      where: { id: newComment.id },
    });

    return NextResponse.json(savedComment);
  } catch (error) {
    console.error('Error adding comment:', error);
    return NextResponse.json({ message: 'Error adding comment' }, { status: 500 });
  }
}

export async function OPTIONS(req: NextRequest) {
  return new NextResponse(null, {
    status: 204,
    headers: {
      'Allow': 'GET, POST'
    }
  });
}