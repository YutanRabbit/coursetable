const express = require('express');
const { createProxyMiddleware } = require('http-proxy-middleware');
const fs = require('fs');
const https = require('https');

const app = express();
const port = 8080;

app.use(
  ['/legacy_api', '/index.php'],
  createProxyMiddleware({
    target: 'http://nginx:8080/',
    pathRewrite: {
      '^/legacy_api': '/', // remove base path
    },
    xfwd: true,
  })
);

app.use(
  '/ferry',
  createProxyMiddleware({
    target: 'http://graphql-engine:8080',
    pathRewrite: {
      '^/ferry': '/', // remove base path
    },
    ws: true,
  })
);

app.use(
  '/',
  createProxyMiddleware({
    target: 'http://frontend:3000',
    ws: true,
  })
);

// Serve with SSL.
https
  .createServer(
    {
      key: fs.readFileSync('server.key'),
      cert: fs.readFileSync('server.cert'),
    },
    app
  )
  .listen(port, () => {
    console.log(`Secure dev proxy listening on port ${port}`);
  });
app.listen(3001, () => {
  console.log(`insecure dev proxy listening on port 3001`);
});
