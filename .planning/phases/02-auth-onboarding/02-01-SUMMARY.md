# Phase 2: Auth Foundation Summary

**Installed Auth.js with the Drizzle adapter, expanded the identity schema for onboarding state, and added the server-first auth primitives the rest of Phase 2 will use.**

## Accomplishments
- Added the Auth.js v5 beta stack with Google provider support, Drizzle adapter wiring, and explicit auth environment scaffolding
- Reshaped the identity model so the existing user table is Auth.js-compatible while still carrying app-owned role and onboarding state
- Added dedicated auth persistence tables plus a new consumer profile table and generated the incremental migration artifact
- Applied the new migration to the configured database and added reusable server-side helpers for session, role, and onboarding enforcement

## Files Created/Modified
- Auth configuration, provider, and route-handler files for the new sign-in stack
- Identity, business, consumer-profile, and schema-index modules plus the new migration artifact
- Shared environment, database-client, session, role, onboarding, and DAL helper modules

## Decisions Made
- Kept one user table and made it Auth.js-compatible instead of creating a separate auth-only user store
- Narrowed v1 roles to consumer and business only, with onboarding completion stored directly on the user record
- Split consumer-only data into a dedicated profile table and kept business onboarding data on the existing business tables
- Kept Google-provider registration conditional on env presence so the app still builds cleanly in environments without OAuth secrets

## Issues Encountered
- Drizzle Kit wanted interactive rename decisions while generating the migration; this was resolved by running the generator through an `expect` wrapper that accepted the intended create-column path
- Real Google OAuth credentials are still absent from the current local environment, so runtime compilation is verified but a live OAuth round-trip is not yet testable here

## Next Phase Readiness
- The auth stack, schema, and database are ready for role-first sign-in routes and onboarding wizards
- Consumer and business lane work can now use shared server-side session and redirect helpers instead of inventing auth flow logic ad hoc

---
*Phase: 02-auth-onboarding*
*Completed: 2026-04-18*
