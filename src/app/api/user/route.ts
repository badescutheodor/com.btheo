import { NextRequest, NextResponse } from 'next/server';
import { verifyToken } from '@/lib/auth';

export function GET(req: NextRequest) {
    const token = req.cookies.get('token')?.value;

    if (!token) {
        return NextResponse.json({ message: 'Not authenticated' }, { status: 401 });
    }

    const user = verifyToken(token);

    if (!user) {
        return NextResponse.json({ message: 'Invalid token' }, { status: 401 });
    }

    return NextResponse.json({
        id: user.userId,
        email: user.email,
        name: user.name,
        role: user.role,
        avatar: user.avatar
    });
}