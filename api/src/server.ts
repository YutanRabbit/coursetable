import express from 'express';
import bodyParser from 'body-parser';
import morgan from 'morgan';
import session from 'cookie-session';
import fs from 'fs';
import https from 'https';
import cors from 'cors';

import {
  PORT,
  INSECURE_PORT,
  SESSION_SECRET,
  CORS_OPTIONS,
  PHP_URI,
  STATIC_FILE_DIR,
} from './config';

const { createProxyMiddleware } = require('http-proxy-middleware');

// import routes
import catalog from './catalog/catalog.routes';
import cas_auth, { casCheck } from './auth/cas_auth.routes';

import passport from 'passport';
import { passportConfig } from './auth/cas_auth.routes';

const app = express();

app.use(cors(CORS_OPTIONS));

// Strip all headers matching X-COURSETABLE-* from incoming requests.
app.use((req, _, next) => {
  for (const header of Object.keys(req.headers)) {
    // Headers are automatically made lowercase by express.
    if (header.startsWith('x-coursetable-')) {
      delete req.headers[header];
    }
  }

  next();
});

// Redirection routes for historical pages.
app.get('/Blog', (_, res) => {
  res.redirect('https://legacy.coursetable.com/Blog.html');
});
app.get('/recommendations.htm', (_, res) => {
  res.redirect('https://legacy.coursetable.com/recommendations.htm');
});

// Enable url-encoding
app.use(bodyParser.urlencoded({ extended: true }));
// Enable request logging.
app.use(morgan('tiny'));
// Setup sessions.
app.use(
  session({
    secret: SESSION_SECRET,

    // Cookie lifetime of one year.
    maxAge: 365 * 24 * 60 * 60 * 1000,

    // We currently set this to false because our logout process involves
    // the client-side JS clearing all cookies.
    httpOnly: false,

    // Not enabling this yet since it could have unintended consequences.
    // Eventually we should enable this.
    // secure: true,
  })
);

// Trust the proxy.
// See https://expressjs.com/en/guide/behind-proxies.html.
app.set('trust proxy', true);

// Serve with SSL.
https
  .createServer(
    {
      key: fs.readFileSync('server.key'),
      cert: fs.readFileSync('server.cert'),
    },
    app
  )
  .listen(PORT, () => {
    console.log(`Secure dev proxy listening on port ${PORT}`);
  });

// We use the IIFE pattern so that we can use await.
(async () => {
  /* Configuring passport */
  passportConfig(passport);
  app.use(passport.initialize());
  app.use(passport.session());

  app.get('/api/auth/test', (req, res) => {
    if (req.user) {
      res.json({ auth: true, id: req.user.netId, user: req.user });
    } else {
      res.json({ auth: false, id: null });
    }
  });

  app.use('/api/static', casCheck);

  // Mount static files route and require NetID authentication
  app.use(
    '/api/static',
    express.static(STATIC_FILE_DIR, {
      cacheControl: true,
      maxAge: '1h',
      lastModified: true,
      etag: true,
    })
  );

  // Setup routes.
  app.get('/api/ping', (req, res) => {
    res.json('pong');
  });
  await catalog(app);
  await cas_auth(app);

  app.use('/legacy_api', casCheck);
  app.use(
    ['/legacy_api', '/index.php'],
    createProxyMiddleware({
      target: PHP_URI,
      pathRewrite: {
        '^/legacy_api': '/', // remove base path
      },
      xfwd: true,
    })
  );

  // restrict GraphQL access for authenticated Yale students only
  app.use('/ferry', casCheck);
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

  // Once routes have been created, start listening.
  app.listen(INSECURE_PORT, () => {
    console.log(`Insecure API listening on port ${INSECURE_PORT}`);
  });
})();
