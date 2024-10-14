import { NextRequest, NextResponse } from 'next/server';
import { validateUser, generateToken } from '@/lib/auth';
import { cookies } from 'next/headers'

export async function POST(req: NextRequest, res: NextResponse) {
    const { email, password } = await req.json();
    const user = await validateUser(email, password);
    
    if (user) {
        const token = await generateToken(user);
        cookies().set('token', token, {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            sameSite: 'strict',
            maxAge: 60 * 60 * 24, // 1 week
        });

        return NextResponse.json({ token, user });
    }

    return NextResponse.json({ message: 'Invalid credentials' }, { status: 401 });
}