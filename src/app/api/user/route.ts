import { NextRequest, NextResponse } from 'next/server';
import { verifyToken } from '@/lib/auth';
import { getUserById } from '@/lib/auth';

export async function GET(req: NextRequest) {
    const token = req.cookies.get('token')?.value;

    if (!token) {
        return NextResponse.json({ message: 'Not authenticated' }, { status: 401 });
    }

    const { id }: any = await verifyToken(token);
    const user = await getUserById(id);
    
    // @ts-ignore
    delete user.password;

    if (!user) {
        return NextResponse.json({ message: 'Invalid token or unexisting user' }, { status: 401 });
    }

    return NextResponse.json(user);
}