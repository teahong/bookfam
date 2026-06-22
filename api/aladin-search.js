const ALADIN_SEARCH_URL = 'https://www.aladin.co.kr/ttb/api/ItemSearch.aspx';

export default async function handler(req, res) {
  if (req.method === 'OPTIONS') {
    setCorsHeaders(res);
    return res.status(204).end();
  }

  if (req.method !== 'GET') {
    setCorsHeaders(res);
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const apiKey = process.env.ALADIN_API_KEY || process.env.VITE_ALADIN_API_KEY || req.query.ttbkey;
  const query = req.query.Query || req.query.query;

  if (!apiKey) {
    setCorsHeaders(res);
    return res.status(500).json({ error: 'ALADIN_API_KEY is not configured' });
  }

  if (!query) {
    setCorsHeaders(res);
    return res.status(400).json({ error: 'Query is required' });
  }

  try {
    const params = new URLSearchParams({
      ttbkey: apiKey,
      Query: query,
      QueryType: req.query.QueryType || 'Keyword',
      MaxResults: req.query.MaxResults || '20',
      start: req.query.start || '1',
      SearchTarget: req.query.SearchTarget || 'Book',
      output: 'js',
      Version: req.query.Version || '20131101',
    });

    const upstreamResponse = await fetch(`${ALADIN_SEARCH_URL}?${params.toString()}`);
    const text = await upstreamResponse.text();

    setCorsHeaders(res);
    res.setHeader('Content-Type', 'application/json; charset=utf-8');

    if (!upstreamResponse.ok) {
      return res.status(upstreamResponse.status).send(text);
    }

    return res.status(200).send(text);
  } catch (error) {
    setCorsHeaders(res);
    return res.status(500).json({
      error: 'Failed to fetch Aladin API',
      message: error instanceof Error ? error.message : String(error),
    });
  }
}

function setCorsHeaders(res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
}
