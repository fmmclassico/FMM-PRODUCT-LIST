# FMM CLASSICO Catalogue

Customer catalogue: `/`  
Admin editor: `/admin.html`  
Shared catalogue API: `/api/catalogue`  
Image upload API: `/api/upload`

This app uses the existing Vercel Blob store via `BLOB_READ_WRITE_TOKEN`. Existing Blob objects are retained; catalogue saves use `fmm-classico/catalogue.json`, and uploaded images are stored under `fmm-classico/media/`.

The admin page has no application password, as requested. It is publicly reachable on the production site, so anyone who knows `/admin.html` can edit the catalogue. Preview deployments remain protected by Vercel SSO.
