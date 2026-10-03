# CheatFile

Share. Code. Download.

A development-ready starter based on the supplied CheatFile specification: Send → 4-digit code → Receive, fixed 1-hour expiry, multiple downloads, SEO pages, responsive UI, and a clean path to S3-compatible storage/PostgreSQL later.

## Current development mode
- Next.js + React + TypeScript frontend
- Node.js + TypeScript API
- Local disk storage for development only
- JSON metadata store for development only
- 5 GB validation limit
- Fixed 1-hour expiration
- Multiple downloads do not invalidate or extend a transfer
- Rate limiting on code attempts
- Private download endpoint (no public file URLs)

## Production migration
Replace the local StorageService and MetadataStore with S3-compatible object storage and PostgreSQL, then add a real queue/worker and malware scanner before public 5GB operation.
