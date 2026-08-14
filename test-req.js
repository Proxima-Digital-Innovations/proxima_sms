async function check() {
  try {
    const res = await fetch('http://localhost:9002/login');
    console.log('Server is up, status:', res.status);
  } catch (err) {
    console.log('Server is down:', err.message);
  }
}
check();
