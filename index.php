<?php
/**
 * Proxima SMS - Laragon Next.js Redirector
 * 
 * Because Proxima SMS is a Next.js (Node.js) application running on port 3000,
 * this file automatically forwards requests from proxima_sms.test to the Next.js server.
 */
$target = "http://localhost:3000" . $_SERVER['REQUEST_URI'];
header("Location: " . $target, true, 302);
?>
<!DOCTYPE html>
<html>
<head>
    <meta http-equiv="refresh" content="0;url=http://localhost:3000/">
    <title>Redirecting to Proxima SMS...</title>
</head>
<body>
    <p>Redirecting to <a href="http://localhost:3000/">http://localhost:3000</a>...</p>
</body>
</html>
