import { NextResponse } from 'next/server';

export async function GET() {
  return NextResponse.json(
    {
      statusCode: 404,
      error: 'Not Found',
      message: 'Admin web authentication is delegated to the LOOKIVA API auth service.',
      path: '/api/auth/[...nextauth]',
      timestamp: new Date().toISOString(),
    },
    { status: 404 }
  );
}

export async function POST() {
  return NextResponse.json(
    {
      statusCode: 404,
      error: 'Not Found',
      message: 'Admin web authentication is delegated to the LOOKIVA API auth service.',
      path: '/api/auth/[...nextauth]',
      timestamp: new Date().toISOString(),
    },
    { status: 404 }
  );
}
