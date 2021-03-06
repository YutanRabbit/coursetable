import { verifyHeaders, refreshCatalog } from './catalog.controllers';
import { verifyNetID } from '../auth/utils';
import express from 'express';
import { STATIC_FILE_DIR } from '../config';
import { fetchCatalog } from './catalog.utils';

import cas_auth, { casCheck } from '../auth/cas_auth.routes';

export default async (app: express.Express) => {
  // Enable static catalog refresh on demand.
  // After the crawler runs, we hit this route to refresh the static files.
  app.get('/api/catalog/refresh', verifyHeaders, refreshCatalog);

  // Generate the static catalog on start.
  console.log('Updating static catalog');
  const overwriteCatalog = process.env.OVERWRITE_CATALOG === 'true';
  await fetchCatalog(overwriteCatalog);
};
