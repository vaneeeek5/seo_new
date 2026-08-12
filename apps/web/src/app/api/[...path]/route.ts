import { NextRequest, NextResponse } from 'next/server';
import dns from 'node:dns';

try {
  dns.setDefaultResultOrder('ipv4first');
} catch (_) {}

const NESTJS_API = process.env.INTERNAL_API_URL || 'http://api:4000';

async function fetchWithRetry(url: string, options: RequestInit, retries = 2, delayMs = 300): Promise<Response> {
  for (let i = 0; i < retries; i++) {
    try {
      return await fetch(url, options);
    } catch (err) {
      if (i === retries - 1) throw err;
      await new Promise((resolve) => setTimeout(resolve, delayMs));
    }
  }
  throw new Error('Fetch failed after retries');
}

async function proxyToNestJS(request: NextRequest, path: string): Promise<NextResponse> {
  const targetUrl = new URL(request.url);
  const searchParams = targetUrl.search;
  const url = `${NESTJS_API}/${path}${searchParams}`;

  try {
    const body = request.method !== 'GET' && request.method !== 'HEAD' ? await request.text() : undefined;

    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };

    const res = await fetchWithRetry(url, {
      method: request.method,
      headers,
      body,
      signal: AbortSignal.timeout(5000),
    }, 2, 300);

    const responseText = await res.text();
    let responseData: unknown;

    try {
      responseData = JSON.parse(responseText);
    } catch {
      responseData = { message: responseText };
    }

    return NextResponse.json(responseData, { status: res.status });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'unknown error';
    console.error(`[Next.js API Proxy Error] Failed to reach NestJS backend at ${url}: ${message}`);

    return NextResponse.json(
      { success: false, error: 'Backend server unavailable', details: message },
      { status: 503 }
    );
  }
}

export async function GET(request: NextRequest, { params }: { params: { path: string[] } }) {
  const path = params.path.join('/');
  return proxyToNestJS(request, path);
}

export async function POST(request: NextRequest, { params }: { params: { path: string[] } }) {
  const path = params.path.join('/');
  return proxyToNestJS(request, path);
}

export async function PUT(request: NextRequest, { params }: { params: { path: string[] } }) {
  const path = params.path.join('/');
  return proxyToNestJS(request, path);
}

export async function PATCH(request: NextRequest, { params }: { params: { path: string[] } }) {
  const path = params.path.join('/');
  return proxyToNestJS(request, path);
}

export async function DELETE(request: NextRequest, { params }: { params: { path: string[] } }) {
  const path = params.path.join('/');
  return proxyToNestJS(request, path);
}
