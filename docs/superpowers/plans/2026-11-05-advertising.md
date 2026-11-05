# Advertising Implementation Plan

Goal: Implement the approved Vietnamese advertising system inside the existing app.
Spec: docs/superpowers/specs/2026-11-05-advertising-design.md (user approved).
Architecture: Existing ES modules + Node API + Turso + private Vercel Blob, no new framework.
Execution: Independent domain service, admin UI, and public-renderer tasks under subagent-driven-development; root handles API/storage/integration and verification. Work on feat/advertising, preserve current files outside assigned scopes.

## Shared interfaces (binding)

`advertising.mjs` exports `createAdvertising({database, now=Date.now})` (async) and `AD_ZONES` array. Each zone has `id`, `page`, `label`, `devices`; ids: home-top, home-bottom, explore-sidebar, explore-content, community-banner, how-it-works-banner, footer-banner. Pages home/explore/community/how-it-works/info; footer supported on all these public contexts.

Service methods, all async:
- `snapshot({from,to}={})` -> {campaigns,advertisers,creatives,placements:{draft:{revision,zones},live:{revision,zones}},settings:{draft:{revision,...},live:{revision,...}},metrics:{impressions,clicks,ctr,revenue},daily:[{date,impressions,clicks,revenue}],revenueEntries,audit,googleReports,zones:AD_ZONES}.
- `action(action,payload,actorId)` applies one of the actions below and returns snapshot().
- `registerCreative(metadata,actorId)` -> creative; metadata {id,filename,alt,hash,variants:[{pathname,width,height,bytes,mime}]}.
- `creative(id,{admin=false}={})` -> metadata or null, only published/eligible campaign references publicly.
- `deliver({page,device,zone,seen={}}, {googleAllowed=false}={})` -> {ad:null|{source:'direct',campaignId,creativeId,token,alt,company,imageUrl,clickUrl},placement} or {ad:{source:'adsense',publisherId,unitId},placement}; runtime supplies image/click endpoint URLs if absent. No user/debt targeting parameters.
- `impression(token)` -> {ok:boolean}; atomic one view per reserved token, consume budget safely.
- `click(token)` -> {url,counted} or null; no client-supplied URL. A paused/expired campaign may still navigate to safe historical destination without recording another valid click; revoked unsafe domains must not redirect.
- `cleanup()` -> counters; `close()`.

Campaign item: {id,draft:CampaignFields,live:CampaignFields|null,state:'draft'|'published'|'paused'|'deleted',effectiveStatus,stats:{impressions,clicks,ctr}}.
CampaignFields: {name,advertiserId,creativeId,url,placement,devices:['desktop','mobile'],startAt:ISO|null,endAt:ISO|null,priority:1..100,impressionLimit:integer|null,frequencyCap:integer,type:'direct'|'adsense',adsenseUnitId?}.
Creative admin record: {id,filename,alt,hash,variants,...}; admin uses `/api/ads/media/:id?preview=1` to preview.

Actions:
- advertiser.save {id?,name,contact?}
- campaign.save {id?,...CampaignFields}; publish/pause/resume/delete each {id}
- placements.save {revision,zones:[{id,device,enabled,source:'auto'|'direct'|'adsense',campaignIds:[],aspect:'6:1'|'3:1'|'2:1',maxWidth,height}]}; placements.publish {revision}
- settings.save {revision,enabled,directEnabled,adsenseEnabled,defaultSource,rotationSeconds,desktopEnabled,mobileEnabled,frequencyCap,blockedDomains:[],publisherId,publicOrigin,googleApproved,consentConfigured,fallbackEnabled,unitMapping:{zoneId:unitId}}; settings.publish {revision}
- revenue.add {campaignId,date:'YYYY-MM-DD',amount:integer VND,note,reversalOf?}
- report.import {rows:[{date,unit,currency,estimatedEarnings:decimal,impressions,clicks}],publisherId,replaceOverlap:boolean,filename}; only official Google schema imported, never estimate from local metrics.

HTTP contract (root):
- GET /api/admin/ads?from=&to= -> snapshot (server admin check)
- POST /api/admin/ads/action {action,payload} -> snapshot
- POST /api/admin/ads/creative: raw JPG/PNG/WebP body <=2MB, Content-Type image/*, X-File-Name percent-encoded name, X-Image-Alt percent-encoded alt -> {creative}. Validate/re-encode sharp, private Blob variants.
- GET /api/ads/media/:id?width=640&preview=1 -> image; preview requires admin; public only eligible live creative.
- POST /api/ads/delivery {page,device,zone,seen} -> delivery (JSON, origin check, bounded inputs)
- POST /api/ads/impression {token} -> {ok}; GET /api/ads/click?token= -> safe 302
- GET /api/admin/ads/preview -> {allowed:true,config:snapshot}; same-origin iframe /ads-preview; uses app components in preview mode without reading private browser storage or running auth/writes; no measurement and no Google scripts.
- GET /api/ads/config -> {settings:public safe settings,zones,revision}; never expose admin-only contact/revenue/drafts.
- GET /api/ads/cleanup requires CRON_SECRET.

## Tasks

- [ ] Task 1: Domain service, migrations and real database tests (`advertising.mjs`, `advertising.test.mjs`). Test scheduling/publish drafts/rotation/caps/concurrent tokens/privacy/reports/audit. Use local SQLite fixtures and adapter; no secrets or live data.
- [ ] Task 2: Vietnamese admin UI (`dist/advertising-admin.mjs`, `dist/advertising-admin.css`, `dist/management.mjs`, `dist/admin.html`). Seven sections, campaign form with upload/preview/status controls, placement editor actual iframe + drag/drop/keyboard, metrics/revenue/Google CSV/settings; match contract above; escape user input.
- [ ] Task 3: Public rendering/preview/public-origin isolation (`dist/advertising-public.mjs`, `dist/advertising.css`, `dist/public.html`, `dist/public-entry.mjs`, `dist/ads-preview.html`, `dist/ads-preview.mjs`, integrate app.mjs/how-it-works.mjs/public info HTML only). First-party banners in safe zones only; never ads on sensitive views; strict AdSense origin/consent guards and no scripted iframe Google delivery. No private storage/bootstrap in preview or public Google entry.
- [ ] Task 4: Root creates storage module/tests/API integration/runtime wiring/routing/cron/security/public-host guard; real uploads to linked private Blob and remote migration verification only after local tests.
- [ ] Task 5: Integrate all interfaces, full suite, independent review, browser desktop/mobile CRUD/publish/pause/remove and editor tests, production stage/smoke/promotion, push GitHub. AdSense and all live advertising default off on release; never fake Google earnings.

Review focus: preview framing boundary; public Google host cannot read private cookies/storage/API; concurrent impression budget; live draft isolation; raw upload parsing/MIME/pixel limits; denied admin; anonymous API leaks; CSV overlaps/currency; ads vanish when entering private app views.

## Ledger

Baseline pending: existing 37 tests. Private Blob store provisioned in hnd1 and linked. No paid plan upgrades. Decisions follow approved design; implementers may resolve minor details while recording deviations here. No tasks complete yet.
