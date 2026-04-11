import { NextRequest, NextResponse } from 'next/server';

const MSC_SERVICE_URL = process.env.MSC_SERVICE_URL || 'http://localhost:3002';
const MSC_ENABLED = process.env.MSC_ENABLED === 'true';

export async function POST(
  request: NextRequest,
  { params }: { params: { target: string } }
) {
  const { target } = await params;

  if (!MSC_ENABLED) {
    return NextResponse.json(
      { 
        error: 'MSCZ conversion service is disabled',
      },
      { status: 503 }
    );
  }

  try {
    const body = await request.arrayBuffer();
    
    const url = new URL(`${MSC_SERVICE_URL}/${target}`);
    request.nextUrl.searchParams.forEach((value, key) => {
      url.searchParams.append(key, value);
    });

    console.log(`Forwarding MSCZ request to: ${url.toString()}`);

    const response = await fetch(url.toString(), {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-musescore',
      },
      body: body,
    });

    if (!response.ok) {
      const errorText = await response.text();
      return NextResponse.json({ error: errorText }, { status: response.status });
    }

    const blob = await response.blob();
    const headers = new Headers();
    
    const contentType = response.headers.get('Content-Type');
    if (contentType) {
      headers.set('Content-Type', contentType);
    }
    
    const contentDisposition = response.headers.get('Content-Disposition');
    if (contentDisposition) {
      headers.set('Content-Disposition', contentDisposition);
    }

    return new NextResponse(blob, {
      status: 200,
      headers: headers,
    });

  } catch (error) {
    console.error('MSCZ API Error:', error);
    
    if (error instanceof TypeError && (error.message.includes('fetch') || error.message.includes('failed'))) {
      return NextResponse.json(
        { 
          error: 'MSCZ service unavailable',
          message: 'Remote conversion service is not running on ' + MSC_SERVICE_URL
        },
        { status: 503 }
      );
    }
    
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
