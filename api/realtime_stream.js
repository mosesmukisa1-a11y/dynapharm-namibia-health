export const config = { runtime: 'edge' };

export default async function handler(req) {
    const { searchParams } = new URL(req.url);
    const channel = searchParams.get('channel') || 'reports';
    const url = process.env.UPSTASH_REDIS_REST_URL;
    const token = process.env.UPSTASH_REDIS_REST_TOKEN;

    if (!url || !token) {
        return new Response('Realtime not configured', { status: 501, headers: corsHeaders() });
    }

    const subscribeUrl = `${url.replace(/\/$/, '')}/subscribe/${encodeURIComponent(channel)}`;
    const upstream = await fetch(subscribeUrl, {
        headers: {
            'Authorization': `Bearer ${token}`,
            'Accept': 'text/event-stream'
        }
    });

    return new Response(upstream.body, {
        status: 200,
        headers: {
            ...corsHeaders(),
            'Content-Type': 'text/event-stream',
            'Cache-Control': 'no-cache',
            'Connection': 'keep-alive'
        }
    });
}

function corsHeaders(){
    return {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization'
    };
}


