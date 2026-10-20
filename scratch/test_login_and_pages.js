const http = require('http');

async function testAuthAndPages() {
  console.log('--- TESTING NEXTAUTH & DASHBOARD ROUTES ---');
  
  // 1. Get CSRF Token and Cookie
  const csrfRes = await fetch('http://localhost:9002/api/auth/csrf');
  const csrfData = await csrfRes.json();
  const csrfCookie = csrfRes.headers.get('set-cookie');
  console.log('CSRF Token obtained:', csrfData.csrfToken ? 'YES' : 'NO');
  console.log('CSRF Cookie:', csrfCookie);

  // 2. Sign in as Admin
  const formData = new URLSearchParams();
  formData.append('csrfToken', csrfData.csrfToken);
  formData.append('identifier', 'admin@proximahub.com');
  formData.append('password', 'password123');
  formData.append('redirect', 'false');

  const headers = {
    'Content-Type': 'application/x-www-form-urlencoded',
  };
  if (csrfCookie) {
    // Extract cookies to pass along
    const cookies = csrfCookie.split(',').map(c => c.split(';')[0]).join('; ');
    headers['Cookie'] = cookies;
  }

  const loginRes = await fetch('http://localhost:9002/api/auth/callback/credentials', {
    method: 'POST',
    headers,
    body: formData.toString(),
    redirect: 'manual',
  });

  console.log('Login response status:', loginRes.status);
  const loginCookies = loginRes.headers.get('set-cookie');
  console.log('Login set-cookie:', loginCookies);

  let sessionCookies = '';
  if (loginCookies) {
    sessionCookies = loginCookies.split(',').map(c => c.split(';')[0]).join('; ');
  }
  if (csrfCookie) {
    const existing = csrfCookie.split(',').map(c => c.split(';')[0]).join('; ');
    sessionCookies = sessionCookies ? `${sessionCookies}; ${existing}` : existing;
  }

  // 3. Test Dashboard Routes with Session Cookie
  const routesToTest = [
    '/dashboard/scores',
    '/dashboard/results/generate',
    '/dashboard/results/view',
    '/dashboard/midterm',
    '/dashboard/midterm/enter',
    '/dashboard/lesson-notes',
    '/dashboard/behavioural'
  ];

  for (const route of routesToTest) {
    console.log(`\nTesting GET ${route}...`);
    const pageRes = await fetch(`http://localhost:9002${route}`, {
      headers: {
        'Cookie': sessionCookies
      },
      redirect: 'manual'
    });
    console.log(`  -> Status: ${pageRes.status} (Location: ${pageRes.headers.get('location') || 'none'})`);
    if (pageRes.status === 200) {
      const text = await pageRes.text();
      console.log(`  -> Rendered OK! (HTML length: ${text.length} chars)`);
    } else if (pageRes.status === 307 || pageRes.status === 302) {
      console.log(`  -> Redirected to: ${pageRes.headers.get('location')}`);
    }
  }
}

testAuthAndPages().catch(console.error);
