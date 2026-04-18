# Phase 2: Consumer Lane Summary

**Converted the shopper side from a public preview into a real Google sign-in and onboarding flow with persisted location and delivery data.**

## Accomplishments
- Reworked the landing page so both public lanes now point at dedicated auth entry routes instead of preview shells
- Added shared auth-intent routing, callback handling, and conflict handling for wrong-account sign-ins
- Built the consumer onboarding page and multi-step wizard with location capture, shopper name confirmation, and delivery-address collection
- Added server-side consumer onboarding persistence that writes the shopper role, marks onboarding complete, and upserts the consumer profile record

## Files Created/Modified
- Public landing and auth entry pages plus the shared auth-entry components
- Consumer onboarding page, wizard component, validation schema, and server action
- Shared auth-intent, geocoding, and normalization helpers used by the onboarding flow

## Decisions Made
- Kept one shared post-auth callback route that resolves intent by role instead of duplicating callback logic per lane
- Used browser geolocation as the practical fallback when Mapbox is missing locally, while still preferring Mapbox geocoding when the token exists
- Kept delivery-address persistence server-side and transactional with the role update so the consumer lane finishes in one write path

## Issues Encountered
- The local environment still lacks Google OAuth and Mapbox credentials, so the flow was verified through build and server-action wiring rather than a real third-party round-trip
- To keep the onboarding flow workable without a local Mapbox token, delivery coordinates fall back to the captured shopper location when the address cannot be geocoded yet

## Next Phase Readiness
- The shared auth entry, callback, and conflict UI are ready for the seller lane to reuse
- The business plan can focus on store-specific onboarding and transactional business creation instead of redoing auth-entry infrastructure

---
*Phase: 02-auth-onboarding*
*Completed: 2026-04-18*
