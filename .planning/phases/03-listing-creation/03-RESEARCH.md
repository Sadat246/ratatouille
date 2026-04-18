# Phase 3: Listing Creation (Snap-to-List) - Research

**Researched:** 2026-04-18  
**Domain:** Mobile-first PWA camera capture, managed image uploads, OCR package-date extraction, and interruptible listing creation in a Next.js 16 App Router app  
**Confidence:** MEDIUM

## Summary

Phase 3 is not just "take three photos and run OCR." It is a combined mobile capture, image-processing, upload, OCR, and validation problem where the quality bar is set by a shopkeeper standing behind a counter with one hand free and less than a minute to finish. The expert pattern is to separate "capture fast" from "interpret accurately": use the device's native capture flow for reliability, normalize images locally, upload directly to managed storage, OCR only the package-date image or derivative, and always require a human confirmation step before publish.

For this project's constraints, the strongest default stack is: **three native image capture slots with immediate preview/retake, local orientation normalization and JPEG compression, IndexedDB draft persistence, signed direct upload to managed storage, server-side Google Cloud Vision OCR for the package-date image, and a strict whitelist parser plus manual confirmation UI**. The biggest research outcome is that the risky parts are not the obvious ones: Safari/mobile capture behavior, oversized image handling, storage abuse from unsigned uploads, and the fact that U.S. food date labels like "Best if Used By," "Sell-By," and "Use-By" do not all mean the same thing.

Given the current stack and the production note that the app runs on a single VM, raw image uploads should **not** be proxied through the main app container. The app server should authenticate/sign uploads, request OCR, and persist metadata; the heavy bytes should go straight to managed storage. Likewise, do not put Tesseract.js on the default mobile hot path unless offline OCR becomes a hard requirement and you have validated it on real low-end phones.

**Primary recommendation:** Use `<input type="file" capture="environment">` as the capture baseline, keep draft photos in IndexedDB, upload accepted images via signed direct uploads, OCR the package-date image server-side with Cloud Vision, and treat OCR as advisory until the user confirms the parsed date and label type.

## Standard Stack

The established stack for this phase:

### Core

| Library / Service | Version | Purpose | Why Standard |
| --- | --- | --- | --- |
| HTML Media Capture (`<input type="file" accept="image/*" capture="environment">`) | Web platform | Mobile camera launch baseline | Most reliable mobile-first capture path for a PWA; works through the browser's native capture/file flow and degrades gracefully to a picker. |
| `navigator.mediaDevices.getUserMedia()` | Web platform | Optional live in-page camera enhancement | Use only as progressive enhancement when you truly need inline live preview or retake without leaving the page. |
| Google Cloud Vision API | Current service | OCR for package-date extraction | Official OCR service with current docs, first 1,000 units/month free, and better fit than client-side WASM OCR for a two-week demo timeline. |
| `@google-cloud/vision` | 5.3.5 | Node client for Vision requests | Official Node integration if OCR is called from the app server. |
| Cloudinary | 2.9.0 | Signed uploads, storage, transformations, CDN delivery | Mature image pipeline that avoids hand-rolling storage, transformations, and delivery now and in later feed phases. |
| IndexedDB via `idb-keyval` | 6.2.2 | Draft persistence for form state and blobs | Very small, promise-based wrapper that can store blobs and is enough for a single in-progress listing draft. |
| `date-fns` | 4.1.0 | Strict parsing, validation, and date arithmetic | Current lightweight standard for date handling; v4 also adds first-class time zone support. |

### Supporting

| Library / Service | Version | Purpose | When to Use |
| --- | --- | --- | --- |
| `browser-image-compression` | 2.0.2 | Resize/compress/transcode images in the browser | Use immediately after capture to reduce upload size, normalize format, and keep OCR latency down. |
| `zod` | 4.3.6 | Validation for pricing, package date, and publish rules | Use for server-side mutation validation and any client schema reuse. |
| `react-hook-form` | 7.72.1 | One-screen client form state | Use if the listing form's client state gets noisy enough that native form state becomes hard to manage. |
| `@hookform/resolvers` | 5.2.2 | RHF + Zod bridge | Use only if RHF is chosen. |
| `Dexie` | 4.4.2 | Richer IndexedDB abstraction | Use instead of `idb-keyval` if planning includes multiple drafts, draft lists, or more complex local queries. |
| `next-cloudinary` | 6.17.5 | Optional Cloudinary UI helpers | Useful only if Cloudinary widget/components fit the product UX; not required for a custom listing flow. |

### Alternatives Considered

| Instead of | Could Use | Tradeoff |
| --- | --- | --- |
| HTML Media Capture baseline | `getUserMedia()` first | More control, but adds HTTPS, permissions, Safari capture behavior, and custom camera UI risk. |
| Cloudinary | UploadThing (`uploadthing` 7.7.4 / `@uploadthing/react` 7.3.3) | Faster secure upload integration and a $0 tier with 2 GB storage, but weaker built-in image transformation story for later consumer-feed work. |
| Google Cloud Vision OCR | `tesseract.js` 7.0.0 | Fully client-side and no API bill, but heavier on device CPU/memory, slower on mobile, and the project explicitly does not improve Tesseract's core recognition model. |
| `idb-keyval` | Dexie | Dexie is better for multi-draft UIs and richer local data models, but is more abstraction than this phase needs if there is only one resumable draft. |
| Strict whitelist parsing with `date-fns` | Natural-language parsing libraries like `chrono-node` | Better for prose, worse for stamped package dates where explicit patterns and validation are more reliable. |

### Installation

```bash
npm install @google-cloud/vision cloudinary browser-image-compression idb-keyval date-fns zod react-hook-form @hookform/resolvers
```

Optional alternatives:

```bash
npm install uploadthing @uploadthing/react
npm install dexie
```

## Architecture Patterns

### Recommended Project Structure

```text
app/
  (business)/
    listings/
      new/                     # Single-screen listing flow
  api/
    uploads/                  # Signed upload endpoints or upload adapters
    ocr/                      # Package-date OCR endpoints
components/
  listing/                    # Capture cards, previews, retake UI, pricing form
lib/
  capture/                    # Camera feature detection and capture helpers
  images/                     # Compression, orientation, transcode helpers
  drafts/                     # IndexedDB draft persistence
  ocr/                        # OCR adapters + package-date normalization/parsing
  validation/                 # Zod schemas and publish rules
  uploads/                    # Cloudinary / UploadThing server helpers
server/
  listings/                   # Final publish mutation and transactional writes
```

### Pattern 1: Native Capture Baseline, Live Camera as Progressive Enhancement

**What:** Treat the browser/device file input flow as the default capture path and layer `getUserMedia()` on top only if it materially improves speed on supported devices.

**When to use:** Always for a mobile PWA that must work on Safari/iOS, Chrome/Android, and imperfect in-store conditions.

**Why this is the recommended pattern here:**
- The HTML `capture` attribute is specifically meant to request new media from the device camera/mic, and it works especially well on mobile.
- `getUserMedia()` is only available in secure contexts, adds permission and camera-switching complexity, and Safari has special behavior around capture permissions and active tabs.
- A native capture fallback keeps the flow working even when custom camera UI fails or a browser ignores the `capture` hint.

**Recommended behavior:**
1. Show three required capture cards: product, seal, package date.
2. Each card opens a native camera/file picker flow first.
3. After capture, show a fast preview with `Looks good` / `Retake`.
4. Only if the device/browser supports it and the UI genuinely benefits should you offer an inline live camera mode.

**Implementation note (inference from MDN + WebKit docs):** If using `getUserMedia()`, prefer `facingMode: { ideal: "environment" }` over `exact` to avoid hard failures on odd device/browser combos.

**Example:**

```tsx
<input
  type="file"
  accept="image/*"
  capture="environment"
/>
```

### Pattern 2: Accepted Photo First, Upload Second

**What:** Keep captured photos local until the user accepts them, then normalize/compress, persist to draft storage, and upload asynchronously. Publishing writes metadata plus already-uploaded asset references.

**When to use:** Any fast listing flow where users retake blurry photos and can be interrupted mid-entry.

**Why it fits this product:**
- It prevents uploading photos the user immediately discards.
- It allows mid-flow auto-save even if the network is slow or a customer interrupts the seller.
- It keeps the single VM out of the raw media data path.

**Recommended data flow:**
1. Capture photo into memory.
2. Preview it immediately.
3. On accept, normalize orientation and transcode/compress to JPEG.
4. Save the accepted blob and form state to IndexedDB.
5. Start background upload to managed storage.
6. Trigger OCR only for the package-date asset or its OCR derivative.
7. Final publish mutation writes listing metadata, validated dates, and asset URLs/public IDs.

**Example:**

```ts
const acceptedDatePhoto = await normalizeAndCompress(file);
await saveDraft({
  packageDatePhoto: acceptedDatePhoto,
  pricing,
  title,
});
await uploadAcceptedPhoto(acceptedDatePhoto);
```

### Pattern 3: Dedicated OCR Derivative, Not the Raw Camera Original

**What:** Generate a smaller, OCR-focused derivative from the package-date photo instead of sending the original full-resolution camera image straight to OCR.

**When to use:** Always.

**Why this is the expert pattern:**
- Vision recommends around `1024x768` for OCR and warns that much larger images increase processing time and bandwidth without proportional accuracy gains.
- Full-size camera images from modern phones are unnecessarily large for reading a stamped date.
- Normalizing to JPEG before OCR avoids format surprises where downstream OCR services do not document support for every Apple-origin format.

**Recommended approach:**
- Keep one reasonably high-quality display asset for the listing.
- Generate a second OCR derivative at roughly the recommended OCR size.
- Optionally crop around the package-date region later if real samples show too much packaging noise.

**Example:**

```ts
const displayImage = await compress(file, { maxWidthOrHeight: 1920 });
const ocrImage = await compress(file, {
  maxWidthOrHeight: 1280,
  fileType: "image/jpeg",
});
```

### Pattern 4: OCR Is Advisory; Publish Is a Validated Human Decision

**What:** Treat OCR output as a prefill suggestion, not as the canonical source of truth. The final package date must be user-confirmed or manually entered.

**When to use:** Always for expiry/package-date extraction.

**Why it matters here:**
- OCR can extract lot codes or nearby text that only looks like a date.
- U.S. food labels use multiple date phrases that may communicate quality rather than safety.
- The roadmap requires `auction end time < package date`, which is a business rule and must not rely on raw OCR text.

**Recommended validation pipeline:**
1. OCR returns raw text and word/box data.
2. Normalize common OCR confusions (`O`/`0`, `I`/`1`, punctuation noise).
3. Extract candidate date substrings using an allowlist of supported formats.
4. Parse with strict `date-fns` formats.
5. Ask the user to confirm or edit.
6. Reject publish if the auction end time is on or after the confirmed package date.
7. Persist the raw OCR text and the user-confirmed value for debugging and future quality improvements.

**Example:**

```ts
const parsedPackageDate = parseSupportedPackageDate(ocrText);

if (!parsedPackageDate) {
  return { status: "manual-entry-required" };
}

if (auctionEndsAt >= parsedPackageDate) {
  throw new Error("Auction must end before the confirmed package date.");
}
```

### Pattern 5: Split File/OCR Endpoints From Final Publish Mutation

**What:** Use a small number of focused server endpoints: upload auth/signing, OCR request handling, and a final authenticated publish mutation.

**When to use:** Always in the App Router.

**Why this is the current standard pattern:**
- Next.js App Router forms and Server Actions are now the standard mutation model for form submissions.
- Route Handlers cleanly handle `FormData` and upload/OCR integration work.
- This split avoids mixing large file traffic with final business validation and database writes.

**Recommended split for this app:**
- Route Handler: signed upload helper or upload adapter endpoint.
- Route Handler: OCR request endpoint for the package-date asset.
- Server Action or authenticated mutation: final listing publish after all client-side and OCR-assisted fields are ready.

### Anti-Patterns to Avoid

- **`getUserMedia()` as the only capture path:** too brittle across mobile browsers and permissions states.
- **Uploading raw phone originals through the app server:** wastes VM bandwidth/CPU and slows the listing loop.
- **Unsigned production uploads:** easy to abuse and hard to clean up.
- **Saving photo blobs to `localStorage`:** storage limits are too small for this use case.
- **Using `new Date(ocrText)` or natural-language parsing as the core date parser:** brittle and browser-dependent.
- **Auto-publishing OCR results without a human confirmation step:** guarantees bad listings sooner or later.
- **Collapsing every package date into a generic "expiry" without storing the label phrase:** loses important semantics that affect trust and later policy decisions.

## Don't Hand-Roll

Problems that look simple but have existing solutions:

| Problem | Don't Build | Use Instead | Why |
| --- | --- | --- | --- |
| Mobile camera capture as a custom-only inline camera | A `getUserMedia()`-only camera system | HTML Media Capture baseline plus optional `getUserMedia()` enhancement | Native capture/file flows handle more browser/device edge cases and degrade more safely. |
| Image normalization/orientation/compression from scratch | A bespoke canvas + EXIF pipeline | `browser-image-compression` plus `createImageBitmap()` where useful | Existing tools already handle worker-based compression, EXIF/orientation concerns, and canvas-size caveats. |
| File storage on the app container or manual upload proxying | Writing photos to the single VM/container filesystem | Cloudinary signed uploads or UploadThing authenticated routes | You need durability, cleanup, abuse resistance, CDN delivery, and future image transformations. |
| OCR on the default mobile hot path | Shipping Tesseract.js to every device by default | Google Cloud Vision server-side OCR | Better fit for mobile performance and the current product deadline; client-side WASM OCR is heavier and lower-confidence on real phones. |
| Draft photo persistence in Web Storage | `localStorage` / cookies for blobs | IndexedDB via `idb-keyval` or Dexie | Web Storage is limited to about 10 MiB total and is string-only; IndexedDB is designed for larger structured data and blobs. |
| Date parsing | `new Date()`, natural-language parsing, or one giant regex without validation | Allowlisted formats plus strict `date-fns` parsing/validation | Package dates are stamped, not natural language, and browser parsing behavior is unreliable. |
| Package-date semantics | Pretending every captured date means "unsafe after this day" | Store raw label phrase plus confirmed date and, ideally, a date-kind enum | USDA guidance shows common food date labels are varied and often quality-based, not uniform safety expirations. |

**Key insight:** The expensive mistakes in this phase come from hand-rolling the media and interpretation pipeline, not from choosing the wrong form library.

## Common Pitfalls

### Pitfall 1: The Custom Camera Works in Desktop Chrome but Fails in Store

**What goes wrong:** The capture flow depends on `getUserMedia()` and works inconsistently on real phones, in Safari, or under permission edge cases.

**Why it happens:** Developers optimize for a custom in-page camera UI before they have a reliable mobile fallback. `getUserMedia()` requires HTTPS, permissions handling, and browser-specific behavior.

**How to avoid:** Start with file input capture for all three photos. Add live camera enhancement only after the baseline flow is solid on real devices.

**Warning signs:** Black preview, repeated camera prompts, inability to switch cameras cleanly, or capture failing in installed PWA mode.

### Pitfall 2: Large Images Make the Flow Feel Slow

**What goes wrong:** Preview, upload, and OCR all feel sluggish because full-resolution phone images are pushed end-to-end.

**Why it happens:** Modern camera images are much larger than OCR and mobile listing flows actually need.

**How to avoid:** Normalize and compress immediately after acceptance. Keep a display asset and a smaller OCR derivative. Aim near the OCR service's recommended size instead of sending originals.

**Warning signs:** Multi-second delay between capture and preview, uploads routinely over a few megabytes, or OCR latency spiking for simple date labels.

### Pitfall 3: OCR Finds a Date-Looking String That Is Not the Right Date

**What goes wrong:** The app auto-fills a lot code, manufacture date, or unrelated packaging text instead of the intended package date.

**Why it happens:** OCR extracts text; it does not reliably infer the business meaning of which date on the package matters.

**How to avoid:** Use a dedicated package-date photo, keep the parsed value editable, store the raw OCR output, and parse only allowlisted date formats.

**Warning signs:** Dates far in the future, impossible month/day combinations, or sellers frequently overriding OCR suggestions.

### Pitfall 4: Drafts Disappear or Hit Browser Storage Limits

**What goes wrong:** Mid-flow drafts vanish, exceed browser storage limits, or fail to resume with photos attached.

**Why it happens:** Developers use `localStorage`, or they assume browser storage is permanently durable by default.

**How to avoid:** Use IndexedDB for blobs and structured draft state. If drafts are considered important enough, request persistent storage with `navigator.storage.persist()`.

**Warning signs:** `QuotaExceededError`, missing draft photos after resume, or reports that drafts randomly disappeared after browser cleanup.

### Pitfall 5: Upload Abuse and Orphaned Media Accumulate

**What goes wrong:** Storage fills with files that never become listings, or attackers/users can upload outside authorized flows.

**Why it happens:** Unsigned public upload presets or unauthenticated endpoints are convenient early on, but they create cleanup and abuse problems.

**How to avoid:** Use signed uploads or authenticated upload middleware, attach a draft/listing identifier to each asset, and plan cleanup for abandoned drafts.

**Warning signs:** Media count growing faster than listing count, unexplained bandwidth/storage growth, or assets with no owner/listing relationship.

### Pitfall 6: OCR/Library Upgrades Quietly Change Behavior

**What goes wrong:** Parse success drops after an OCR model or dependency upgrade even though API shapes did not change.

**Why it happens:** Vision release notes document OCR model upgrades, and newer Tesseract versions have changed worker behavior and output defaults over time.

**How to avoid:** Keep a representative sample corpus of real package-date photos and rerun it whenever OCR-related dependencies or service settings change.

**Warning signs:** Sudden increase in manual corrections, confidence-score drift, or parse failures after an otherwise routine dependency bump.

### Pitfall 7: "Expiry" Is Not a Neutral Product Term

**What goes wrong:** The UI, data model, or downstream business logic assumes every captured date is a hard safety cutoff.

**Why it happens:** U.S. packaged food labels commonly use several phrases for quality dates, and they are not standardized into one universal safety meaning.

**How to avoid:** Decide during planning whether the app should model a generic `packageDate` plus `dateLabelKind` rather than a single `expiry` field. At minimum, store the raw label phrase alongside the confirmed date.

**Warning signs:** Seller confusion about what photo to take, consumer confusion about whether an item is unsafe, or future policy arguments about which dates qualify for listing.

## Code Examples

Verified or doc-aligned patterns from official/current sources:

### Native Mobile Capture Baseline

```tsx
<input
  type="file"
  accept="image/*"
  capture="environment"
/>
```

Source: MDN HTML `capture` attribute, WebKit HTML Media Capture notes.

### App Router File/OCR Endpoint Shape

```ts
export async function POST(request: Request) {
  const formData = await request.formData();
  const photo = formData.get("packageDatePhoto");

  if (!(photo instanceof File)) {
    return Response.json({ error: "Missing photo" }, { status: 400 });
  }

  return Response.json({ ok: true });
}
```

Source: Next.js App Router Route Handler and Forms docs.

### Vision OCR Request With an OCR-Focused Image

```ts
const [result] = await client.annotateImage({
  image: { content: ocrBase64Jpeg },
  features: [{ type: "TEXT_DETECTION" }],
  imageContext: { languageHints: ["en"] },
});
```

Source: Google Cloud Vision OCR docs and features docs.  
Note: `DOCUMENT_TEXT_DETECTION` is the alternative when real samples show dense text or handwriting performs better there.

### Optional Live Camera Enhancement

```ts
const stream = await navigator.mediaDevices.getUserMedia({
  video: {
    facingMode: { ideal: "environment" },
  },
});
```

Source: MDN `getUserMedia()` and `facingMode` docs.  
Note: Use `ideal`, not `exact`, unless you want hard failure when the back camera is unavailable.

### Request More Durable Browser Storage for Drafts

```ts
if ("storage" in navigator && "persist" in navigator.storage) {
  await navigator.storage.persist();
}
```

Source: MDN Storage quotas and eviction criteria.

## State of the Art (2024-2026)

What's changed recently:

| Old Approach | Current Approach | When Changed | Impact |
| --- | --- | --- | --- |
| Pages Router/API-route-centric form mutations | App Router forms + Server Actions + Route Handlers | Current Next.js docs, updated through 2026-02-27 | Keep final publish in a Server Action or authenticated mutation and use Route Handlers for file/OCR work. |
| Older Tesseract.js tutorials using older worker setup and workaround-heavy guidance | Tesseract.js v7 with current async worker API and fixed memory leak noted in current project docs | Current npm/GitHub state as of 2026-04-18 | If you spike Tesseract, ignore old v2/v5 blog posts and validate against current docs only. |
| Needing separate timezone helpers for all date-zone work | `date-fns` v4 now has first-class timezone support | `date-fns` v4 announced 2024-09-16; current npm 4.1.0 | Helpful later when auction end time must be safely compared across user/store time zones. |
| Assuming Vision OCR output behavior is static | Vision release notes document model upgrades and OCR behavior changes over time | 2021-2024+ release notes | Treat OCR as probabilistic and regression-test on sample images rather than hardcoding assumptions. |

**New tools/patterns to consider:**
- **Signed direct uploads as the default architecture:** keep authentication on your server, but keep bytes off the single app VM.
- **OCR sample corpus testing before planning:** use 20-30 real package-date photos to choose between `TEXT_DETECTION` and `DOCUMENT_TEXT_DETECTION` and to tune parsing heuristics.
- **Persisted draft storage:** request persistent browser storage if draft loss would materially hurt the listing loop.

**Deprecated/outdated:**
- **`getUserMedia()`-only capture UX:** outdated as the sole solution for a fast mobile marketplace flow.
- **LocalStorage-based photo drafts:** outdated for any multi-photo mobile form.
- **Unsigned production uploads:** acceptable for a quick prototype, but not a good long-term path once the app is public or semi-public.

## Open Questions

1. **Should the product model a generic package date instead of a single expiry field?**
   - What we know: USDA guidance says common U.S. date-label phrases vary and are often quality-oriented rather than hard safety expirations.
   - What's unclear: Whether the v1 pitch/demo language can tolerate a more precise `packageDate` model.
   - Recommendation: Decide this during planning. At minimum, store the raw label phrase even if the UI copy still says "Expiry."

2. **Is later-phase image transformation/delivery value worth paying the Cloudinary integration cost now?**
   - What we know: Cloudinary gives uploads, transformations, and CDN delivery; UploadThing gives faster secure upload DX and a smaller initial surface area.
   - What's unclear: Whether Phase 5 will need image variants badly enough to justify choosing Cloudinary immediately.
   - Recommendation: Choose Cloudinary if you want to avoid a later media-pipeline migration; choose UploadThing only if implementation speed dominates and later migration is acceptable.

3. **Do we need one resumable draft or several?**
   - What we know: The phase context strongly wants interruption tolerance.
   - What's unclear: Whether sellers must resume multiple half-finished listings or only the current one.
   - Recommendation: Single draft means `idb-keyval` is enough; a multi-draft queue pushes you toward Dexie and a dedicated drafts UI.

4. **How accurate does OCR need to be before the fallback stops feeling annoying?**
   - What we know: Cloud Vision is the stronger default bet for this deadline, but real package photos determine success far more than API docs do.
   - What's unclear: Actual success rate across categories like dairy, frozen, bakery, pantry, and beverages.
   - Recommendation: Before planning tasks, collect a small real-photo sample set and benchmark parse success on actual store-style captures.

## Sources

**Tooling note:** Context7 was not available in this workspace on 2026-04-18, so this research used official docs, official package metadata/readmes, and cross-verified primary web sources instead.

### Primary (HIGH confidence)

- MDN: HTML `capture` attribute  
  https://developer.mozilla.org/en-US/docs/Web/HTML/Reference/Attributes/capture
- MDN: `getUserMedia()`  
  https://developer.mozilla.org/en-US/docs/Web/API/MediaDevices/getUserMedia
- MDN: `facingMode` constraint  
  https://developer.mozilla.org/en-US/docs/Web/API/MediaTrackConstraints/facingMode
- MDN: `createImageBitmap()`  
  https://developer.mozilla.org/en-US/docs/Web/API/Window/createImageBitmap
- MDN: Using IndexedDB  
  https://developer.mozilla.org/en-US/docs/Web/API/IndexedDB_API/Using_IndexedDB
- MDN: Storage quotas and eviction criteria  
  https://developer.mozilla.org/en-US/docs/Web/API/Storage_API/Storage_quotas_and_eviction_criteria
- Next.js: Forms guide  
  https://nextjs.org/docs/app/guides/forms
- Next.js: Route Handler reference  
  https://nextjs.org/docs/app/api-reference/file-conventions/route
- Google Cloud Vision: OCR guide  
  https://docs.cloud.google.com/vision/docs/ocr
- Google Cloud Vision: Features list  
  https://docs.cloud.google.com/vision/docs/features-list
- Google Cloud Vision: Supported image formats and dimensions  
  https://docs.cloud.google.com/vision/docs/supported-files
- Google Cloud Vision: Pricing  
  https://cloud.google.com/vision/pricing
- Google Cloud Vision: Release notes  
  https://docs.cloud.google.com/vision/docs/release-notes
- Cloudinary: Next.js upload docs  
  https://cloudinary.com/documentation/nextjs_image_and_video_upload
- Cloudinary: Pricing  
  https://cloudinary.com/pricing
- UploadThing: Next.js App Router setup  
  https://docs.uploadthing.com/getting-started/appdir
- UploadThing: Product/pricing page  
  https://uploadthing.com/
- USDA infographic: Food date labeling  
  https://www.usda.gov/sites/default/files/documents/USDA-Food-Date-Labeling-Infographic.pdf

### Secondary (MEDIUM confidence)

- WebKit: HTML Media Capture support notes  
  https://webkit.org/blog/7477/new-web-features-in-safari-10-1/
- WebKit: WebRTC/media capture behavior in Safari  
  https://webkit.org/blog/7763/a-closer-look-into-webrtc/
- Tesseract.js GitHub README  
  https://github.com/naptha/tesseract.js
- `browser-image-compression` npm package/readme  
  https://www.npmjs.com/package/browser-image-compression
- `idb-keyval` npm package/readme  
  https://www.npmjs.com/package/idb-keyval
- `date-fns` npm package/readme  
  https://www.npmjs.com/package/date-fns
- `date-fns` v4 announcement  
  https://blog.date-fns.org/v40-with-time-zone-support/

### Package Metadata Used For Current Versions

- `@google-cloud/vision` 5.3.5
- `cloudinary` 2.9.0
- `uploadthing` 7.7.4
- `@uploadthing/react` 7.3.3
- `idb-keyval` 6.2.2
- `Dexie` 4.4.2
- `browser-image-compression` 2.0.2
- `date-fns` 4.1.0
- `react-hook-form` 7.72.1
- `@hookform/resolvers` 5.2.2
- `zod` 4.3.6
- `tesseract.js` 7.0.0
- `next-cloudinary` 6.17.5

## Metadata

**Research scope:**
- Core technology: mobile web camera capture, managed uploads, OCR, date parsing, draft persistence
- Ecosystem: Cloudinary, UploadThing, Google Cloud Vision, Tesseract.js, IndexedDB wrappers, image compression helpers
- Patterns: progressive capture enhancement, direct-to-storage uploads, OCR advisory flow, strict publish validation
- Pitfalls: mobile browser capture behavior, oversized images, upload abuse, draft durability, date-label semantics

**Confidence breakdown:**
- Standard stack: HIGH - grounded in official docs and current package metadata
- Architecture: MEDIUM - strong primary-source backing, but still needs validation against real package photos and actual device tests
- Pitfalls: HIGH - browser/storage/OCR service behavior is well documented
- Code examples: MEDIUM - minimal doc-aligned examples intended to illustrate patterns, not drop-in implementation

**Research date:** 2026-04-18  
**Valid until:** 2026-05-18 unless OCR models, upload pricing, or storage provider constraints change materially

---

*Phase: 03-listing-creation*  
*Research completed: 2026-04-18*
