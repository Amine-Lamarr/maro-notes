import { Handler } from '@netlify/functions';

export const handler: Handler = async (event) => {
  try {
    const targetUrl = event.queryStringParameters?.url;
    if (!targetUrl) {
      return { statusCode: 400, body: JSON.stringify({ error: 'Missing url parameter' }) };
    }
    
    // Fetch the PDF from Supabase
    const response = await fetch(targetUrl);
    if (!response.ok) {
      return { statusCode: response.status, body: JSON.stringify({ error: 'Failed to fetch from remote' }) };
    }
    
    const buffer = await response.arrayBuffer();
    
    return {
      statusCode: 200,
      headers: {
        'Content-Type': 'application/pdf',
        'Access-Control-Allow-Origin': '*',
      },
      // Netlify functions require binary data to be base64 encoded
      isBase64Encoded: true,
      body: Buffer.from(buffer).toString('base64'),
    };
  } catch (error: any) {
    console.error('Proxy error:', error);
    return { statusCode: 500, body: JSON.stringify({ error: error.message }) };
  }
};
