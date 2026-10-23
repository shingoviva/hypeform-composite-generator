# Agency / Batch Editing

## User Workflow

The desktop-only checkbox above the editor opens the agency controls. It is collapsed by default. On phones (CSS width below 1024px), the toolbar is hidden and a fresh visit restores the personal draft, not an agency model.

1. Download the CSV template. It has UTF-8 BOM for Excel, instructions in # comment rows, two fictional examples and stable model_id values.
2. Replace the examples and add models in Excel. Save as CSV UTF-8. model_id and name are required; measurements are numeric cm. Visibility columns use 1/0. Instagram accepts @account or a profile URL.
3. Import the CSV, check the preview, and select a model by its ID/name. Search and previous/next controls are available.
4. Photos, crop/zoom, exposure/vibrance, typography, watermark, second-page settings and profile edits are saved separately for each model. Switching awaits the previous model's save; returning loads its latest record. A failed save blocks switching without discarding the editor contents.
5. Save an editing ZIP with an optional custom name. The default filename includes local date/time. This is an editable project backup, not a collection of rendered PDFs.
6. Resume by importing the ZIP directly, or select its extracted root folder. Importing models.csv first also works, but the browser must be granted the folder through the subsequent folder picker before relative photos can be read. A CSV file alone cannot grant access to sibling files.

Matching browser records can be preferred during import. Plain CSV matches require both the ID and the original/current name to match, so an unrelated roster reusing IDs does not silently reuse old photos. Exported editing CSVs also carry their workspace ID. Unchecking browser priority adopts the file's CSV profile and stored project settings instead.

The personal draft is stored separately and returns when agency mode is closed. Reset in agency mode affects only the current model: it returns to the imported CSV profile with no photos/adjustments, after confirmation. Other models are unchanged.

## ZIP Contents

- models.csv: editable profile values and app_workspace_id, app_data, app_updated_at metadata. Do not edit the app_ columns.
- data/models/{model_id}.json: per-model editing/layout settings and relative photo references.
- data/assets/{sha256}.{extension}: original and cropped photo/logo bytes. Identical assets are deduplicated within the ZIP.
- README.txt: Japanese and English reopening instructions.

Keep the folder together. The importer checks relative paths, required assets, image hashes, IDs and project version before replacing the active workspace. Import writes to a staging collection; the workspace manifest is committed last. Errors leave the previous workspace active.

## Cache And Multiple Tabs

Agency records use a separate IndexedDB database. Only the active model's photos are materialized as object URLs; switching does not keep the entire roster's photo data in memory. Browser storage is best-effort: low disk space, private browsing and clearing site data may remove it. Keep ZIP backups. Tabs must share the same browser profile and site origin; this is not account-based synchronization across devices.

Each model has an atomic revision check. BroadcastChannel plus a storage-event fallback propagates changes to other tabs. Clean editors can load a newer version; dirty editors and open crop dialogs retain local changes and display a conflict notice. A stale tab cannot overwrite the new record. The user can save a ZIP containing its local version or explicitly load the latest one. Each tab remembers its selected model independently using sessionStorage. Previous collections are retained when a roster is replaced so another open tab is not deprived of its backing records; site data removal can reclaim this storage after backups are made.

## Limits And Validation

- Up to 1000 models per CSV; CSV size 8 MB; maximum field length 4000 characters.
- ZIP/extracted-project size up to 512 MB, 20000 files, 64 MB per asset and 2 MB per model JSON. These are safety limits, not a promise that every browser can handle the maximum; large photo collections should be split into rosters.
- Commas, quotes, multiline values and Japanese text use Papa Parse. Exports protect spreadsheet formula prefixes while preserving phone numbers on reimport.
- ZIP handling uses fflate. No project/photo upload to a server is performed by this feature.

## Verification

Run the dev server on 127.0.0.1:8126, install Playwright browsers, then run npm run test:agency. APP_TEST_URL, PLAYWRIGHT_MODULE and CHROME_PATH may point to an existing test runtime.

WebKit/Chromium tests cover template download, model switching without photo leakage, restored crop/exposure, cross-tab clean updates and conflict retention, ZIP backup of local conflict edits, fresh-browser ZIP/folder reimport, personal/mobile isolation, CSV quoting/formula round trips and one-writer-only atomic revision checks. Existing personal draft, keyboard visibility, editor-control synchronization and two-page Instagram regressions are checked separately. Native iPhone share sheets and real-world agency-scale photo sets still require manual validation.

The agency suite also exercises a 300-model roster, search and return-to-model persistence, Japanese controls at 1024px, CSV-only resumption from matching browser records, unrelated-ID collision protection, invalid-input retention and a crop dialog protected from another tab's update. The Instagram profile suite (npm run test:instagram-profile) checks 80 combinations per engine across fonts, name positions, pages and Instagram split sides, including the visibility toggle.

The optional model Instagram field is part of both personal and CSV profiles. It appears near the name when enabled, on A4 pages and their Instagram exports.

Instagram accepts a bare account name, @account, or an Instagram profile URL (including a URL without https://), and consistently displays @account. Agency visibility is optional in both the editor and preview controls; hiding it retains its text. The show_agency CSV column uses 1/0 and is preserved in editing ZIPs. Older personal drafts retain their agency display; older CSVs without this column show a nonempty agency automatically. Regression coverage includes these input forms, visibility persistence and CSV/ZIP round trips.

## Dependency Audit

The added CSV/ZIP packages have no advisories in the install-time npm audit. The existing dependency tree reports 18 advisories, including a critical proxy-addr advisory in Express's server-side dependency tree. The deployed application is static; this change does not add an Express server. Those pre-existing dependencies have not been broadly upgraded in this feature change and should receive a separate maintenance review before adding any server deployment.
