import { NextRequest, NextResponse } from 'next/server';

const OMR_SERVICE_URL = process.env.OMR_SERVICE_URL || 'http://localhost:8080';
const OMR_ENABLED = process.env.OMR_ENABLED === 'true'; // Feature flag

export async function POST(request: NextRequest) {
  // Check if feature is enabled
  if (!OMR_ENABLED) {
    return NextResponse.json(
      { 
        error: 'OMR service is temporarily unavailable',
        message: 'This feature is currently in development and will be available soon.'
      },
      { status: 503 } // Service Unavailable
    );
  }

  try {
    const formData = await request.formData();
    
    // Forward request to Python backend
    const response = await fetch(`${OMR_SERVICE_URL}/convert`, {
      method: 'POST',
      body: formData,
    });

    if (!response.ok) {
      const errorData = await response.json();
      return NextResponse.json(errorData, { status: response.status });
    }

    // Get the binary data
    const blob = await response.blob();
    
    // Extract ALL headers from backend response
    const headers = new Headers();
    
    // Copy Content-Type
    const contentType = response.headers.get('Content-Type');
    if (contentType) {
      headers.set('Content-Type', contentType);
    }
    
    // Copy Content-Disposition (filename)
    const contentDisposition = response.headers.get('Content-Disposition');
    if (contentDisposition) {
      headers.set('Content-Disposition', contentDisposition);
      console.log('✅ Forwarding Content-Disposition:', contentDisposition);
    }
    
    // Copy warnings header
    const warnings = response.headers.get('X-Conversion-Warnings');
    if (warnings) {
      headers.set('X-Conversion-Warnings', warnings);
    }

    return new NextResponse(blob, {
      status: 200,
      headers: headers,
    });

  } catch (error) {
    console.error('OMR API Error:', error);
    
    // Friendly error for when Docker service is down
    if (error instanceof TypeError && error.message.includes('fetch')) {
      return NextResponse.json(
        { 
          error: 'OMR service unavailable',
          message: 'Backend service is not running. Please contact support.'
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