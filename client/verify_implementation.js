import fs from 'fs';

async function runVerification() {
  console.log('=== PHASE 6: MANDATORY VERIFICATION TESTS ===\n');
  const API_KEY = 'hicine_website_secret_2025_exi9epdmrns';
  const headers = {
    'Accept': 'application/json',
    'Content-Type': 'application/json',
    'x-api-key': API_KEY,
  };

  let passed = 0;
  let total = 0;

  function assert(condition, name) {
    total++;
    if (condition) {
      console.log(`✅ [PASS] ${name}`);
      passed++;
    } else {
      console.error(`❌ [FAIL] ${name}`);
    }
  }

  // 1. Stats Endpoint
  try {
    const res = await fetch('https://api.hicine.biz/rpc/stats', { headers });
    const stats = await res.json();
    assert(res.ok && stats.total > 10000, `API Stats: ${stats.total} total cataloged titles verified`);
  } catch (err) {
    assert(false, `API Stats error: ${err.message}`);
  }

  // 2. Search Endpoint & Live Results
  let testMovieId = null;
  try {
    const res = await fetch('https://api.hicine.biz/rpc/search/avengers', { headers });
    const results = await res.json();
    assert(res.ok && Array.isArray(results) && results.length > 0, `Search API: returned ${results?.length} items for "avengers"`);
    if (results.length > 0) {
      testMovieId = results[0].data?._id || results[0]._id;
    }
  } catch (err) {
    assert(false, `Search API error: ${err.message}`);
  }

  // 3. Movie Details & Link Parsing
  try {
    const id = testMovieId || '6adc445b57cc11836fd16576';
    const res = await fetch(`https://api.hicine.biz/api/movies/${id}`, { headers });
    const movie = await res.json();
    assert(res.ok && movie && movie.title, `Movie Details: fetched "${movie?.title}"`);
    
    // Test link parser
    const linksText = movie.links;
    const lines = linksText.split('\n').filter(Boolean);
    const parsed = lines.map(line => {
      const parts = line.split(', ').map(p => p.trim());
      const servers = [];
      for (let i = 0; i < 7; i++) {
        if (parts[i] && parts[i].startsWith('http')) servers.push(parts[i]);
      }
      return {
        quality: parts[7] || 'HD',
        size: parts[8] || 'N/A',
        serverCount: servers.length,
      };
    });
    assert(parsed.length > 0 && parsed[0].serverCount > 0, `Multi-server Parser: parsed ${parsed.length} qualities with ${parsed[0].serverCount} mirror links`);
  } catch (err) {
    assert(false, `Movie Details error: ${err.message}`);
  }

  // 4. Series & Season Parsing
  try {
    const res = await fetch('https://api.hicine.biz/rpc/search/stranger', { headers });
    const results = await res.json();
    const series = results.find(r => (r.data?.title || r.title || '').toLowerCase().includes('stranger'))?.data;
    assert(series && (series.season_1 || series.season_1_cloud), `Series Search: found "${series?.title}" with season data`);

    if (series && series.season_1) {
      const lines = series.season_1.split('\n').filter(l => l.includes('Episode'));
      assert(lines.length > 0, `Series Season Parser: parsed ${lines.length} episodes for Season 1`);
    }
  } catch (err) {
    assert(false, `Series verification error: ${err.message}`);
  }

  // 5. Cloudflare Deployment Readiness (Workers Static Assets SPA config and _headers)
  try {
    const hasHeaders = fs.existsSync('/data/data/com.termux/files/home/hic/client/dist/_headers');
    const headersContent = hasHeaders ? fs.readFileSync('/data/data/com.termux/files/home/hic/client/dist/_headers', 'utf-8') : '';
    const validHeaders = headersContent.includes('Cache-Control') && headersContent.includes('X-Content-Type-Options');
    const wranglerContent = fs.readFileSync('/data/data/com.termux/files/home/Projects/hic/wrangler.toml', 'utf-8');
    const hasSpaConfig = wranglerContent.includes('not_found_handling = "single-page-application"');
    assert(hasHeaders && validHeaders && hasSpaConfig, 'Cloudflare Deployment: Workers Static Assets SPA routing and _headers verified');
  } catch (err) {
    assert(false, `Cloudflare configuration check error: ${err.message}`);
  }

  // 6. Production Build Artifacts Integrity
  try {
    const distIndex = fs.existsSync('/data/data/com.termux/files/home/hic/client/dist/index.html');
    const distAssets = fs.readdirSync('/data/data/com.termux/files/home/hic/client/dist/assets');
    const hasJs = distAssets.some(f => f.endsWith('.js'));
    const hasCss = distAssets.some(f => f.endsWith('.css'));
    assert(distIndex && hasJs && hasCss, `Production Build Assets: index.html, JS and CSS bundles intact in dist/`);
  } catch (err) {
    assert(false, `Build artifact check error: ${err.message}`);
  }

  console.log(`\nVerification Summary: ${passed}/${total} checks PASSED.`);
}

runVerification();
