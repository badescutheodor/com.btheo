import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import { getDB } from '@/lib/db';
import { RawAnalytic } from '@/lib/entities/RawAnalytic';
import { Analytic } from '@/lib/entities/Analytic';
import EntityValidator from '@/lib/entities/EntityValidator';
import { QueryHandler, QueryOptions } from '@/lib/utils-server';
import { cookies } from "next/headers";
import { v4 as uuidv4 } from 'uuid';
import CryptoJS from 'crypto-js';

const ENCRYPTION_KEY = process.env.NEXT_PUBLIC_ENCRYPTION_KEY || "";

function decryptData(encryptedData: string): any {
  const bytes = CryptoJS.AES.decrypt(encryptedData, ENCRYPTION_KEY);
  return JSON.parse(bytes.toString(CryptoJS.enc.Utf8));
}

export async function POST(req: NextRequest) {
    try {
      let identifier = cookies().get('y')?.value;
      const hasIdentifier = !!identifier;
      identifier = identifier ? identifier : uuidv4();

      const db = await getDB();
      const rawAnalyticRepository = db.getRepository(RawAnalytic);
      const reqBody = await req.json();

      // Check if the request is a batch insert
      const analytics = Array.isArray(reqBody.data) 
      ? reqBody.data.map((data: string) => decryptData(data)) : [
        decryptData(reqBody.data)
      ];

      const validatedAnalytics = [];
      const errors = [];
  
      for (const analytic of analytics) {
        analytic.sessionId = identifier;
        analytic.ipAddress = req.headers.get('x-real-ip') || req.headers.get('x-forwarded-for') || req.connection.remoteAddress;
        analytic.userAgent = req.headers.get('user-agent');
        const rawAnalytic = rawAnalyticRepository.create(analytic);
        const validationErrors = await EntityValidator.validate(rawAnalytic, RawAnalytic);
  
        if (Object.keys(validationErrors).length > 0) {
          errors.push({ analytic, errors: validationErrors });
        } else {
          validatedAnalytics.push(rawAnalytic);
        }
      }
  
      if (errors.length > 0) {
        return NextResponse.json({ errors }, { status: 400 });
      }

      if (!hasIdentifier) {
        cookies().set('y', identifier, {
            maxAge: 60 * 60 * 24 * 365,
            secure: process.env.NODE_ENV === 'production',
            httpOnly: true,
        });
      }
  
      await rawAnalyticRepository.save(validatedAnalytics);
      return NextResponse.json({ ok: validatedAnalytics.length }, { status: 201 });
    } catch (error) {
      console.error(error);
      return NextResponse.json({ message: 'Error storing data' }, { status: 500 });
    }
  }

export async function GET(req: NextRequest) {
    try {
      const user = await getSession(req);
      if (!user || user.role !== 'admin') {
        return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
      }
  
      const db = await getDB();
      const analyticRepository = db.getRepository(Analytic);
      const queryHandler = new QueryHandler(analyticRepository);
  
      // Set up role-based field access
      queryHandler.setRoleFields('admin', ['id', 'type', 'data', 'createdAt', 'updatedAt']);
  
      const url = new URL(req.url);
      const start = url.searchParams.get('start');
      const end = url.searchParams.get('end');
      const type = url.searchParams.get('type');
  
      const queryOptions: QueryOptions<Analytic> = {
        filters: {
          ...(type && { type }),
          ...(start && end && { createdAt: { $gte: new Date(start), $lt: new Date(end) } })
        },
        page: Number(url.searchParams.get('page')) || 1,
        limit: Number(url.searchParams.get('limit')) || 1000
      };
  
      const result = await queryHandler.filterMulti(queryOptions, [], 'admin');
      return NextResponse.json(result);
    } catch (error) {
      console.error(error);
      return NextResponse.json({ message: 'Error fetching analytics' }, { status: 500 });
    }
};
  
export async function OPTIONS(req: NextRequest) {
  return new NextResponse(null, {
    status: 204,
    headers: {
      'Allow': 'GET, POST'
    }
  });
}