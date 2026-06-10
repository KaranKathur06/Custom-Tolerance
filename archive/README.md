# Archive

Deprecated code kept for reference and rollback only. **Not deployed to production.**

## `backend-nestjs/`

Legacy NestJS API (port 5000). Replaced by Next.js Route Handlers under `app/api/`.

To restore for local debugging:

```bash
cp -r archive/backend-nestjs backend
cd backend && npm install && npm run start:dev
```

See [docs/MIGRATION_NESTJS_TO_NEXTJS.md](../docs/MIGRATION_NESTJS_TO_NEXTJS.md).
