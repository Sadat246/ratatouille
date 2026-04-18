# Phase 3 Plan 2: Capture and OCR Plumbing Summary

**Built the Phase 3 media pipeline with resumable draft persistence, authenticated uploads, and advisory OCR package-date extraction.**

## Accomplishments

- Added accepted-photo compression helpers plus a typed draft snapshot model that keeps the three required photo slots explicit
- Persisted seller listing drafts in IndexedDB with blob support so accepted photos and field values survive refreshes and interruptions
- Added seller-authenticated upload and OCR endpoints with seller-membership checks at the edge of both routes
- Wired storage fallback behavior so local development can save listing photos without managed credentials while Cloudinary remains the managed path when configured
- Added OCR parsing and package-date normalization that returns advisory results, manual-entry-required guidance, or provider-unavailable fallback state
- Documented the Phase 3 OCR and image-storage environment variables in the example env file

## Files Created/Modified

- Added client image helpers, draft persistence, OCR parsing, and storage adapters
- Added seller upload and OCR route handlers plus the supporting environment updates
- Updated package dependencies for image compression, IndexedDB persistence, and OCR support

## Decisions Made

- Kept accepted photos local first, then uploaded them after review, so sellers can retake a bad shot without generating orphaned media
- Stored listing drafts in IndexedDB rather than localStorage because the flow needs blob persistence, not string-only storage
- Treated OCR as advisory only and returned explicit manual-entry fallback states instead of blocking the seller when credentials or parsing are unavailable
- Used Cloudinary when configured and a local public-upload fallback otherwise so the desk still works in development without managed media credentials

## Issues Encountered

- The original draft persistence helper used the wrong `idb-keyval` API for the installed version, which broke the production build; switching to the correct store factory resolved it cleanly

## Next Step

Ready for 03-03-PLAN.md
