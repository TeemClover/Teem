# ห้องเรียน myClover — frontend handoff

Public shell: `/learn/`. Course data, entitlement, progress and media always come from authenticated APIs. No private video, resource body, course manifest or paid asset URL is embedded in these public files. The backend remains the access authority.

## Routes and account flow

- `/learn/`: only server-returned enrollments; registered/pending statuses included. Empty accounts see an empty room, without unrelated courses.
- `/learn/?course=ai-sauce&lesson=ADV01`: enrolled course and lesson selection. A locked deep link falls back to the available preview and updates the URL.
- `/learn/?enroll=ai-sauce&lesson=EP01`: verify identity through existing Google sign-in or configured email OTP, create registration through `POST /api/learn?action=enroll`, then open the existing EP01 sample.
- `/learn/?enroll=ai-sauce&return=%2Fai-source%2F%23bank-details`: same account/registration flow, then return to sales. Allowed return paths are `/ai-source/`, `/learn/`, and guarded `/learn/classroom/` pages on this origin only. Foundation onboarding preserves the requested room and work reference. Registration itself does not assert payment or open paid content.
- Existing `MC_ACCOUNT.open('login')` remains available. Provider availability comes from `/api/auth/providers`; the OTP form appears only when `otp:true` confirms a sender is configured. Google uses the existing `/api/auth/oauth/google/start` route. Both preserve the intended local return and require enrollment consent before proceeding. OTP uses the existing request/verify/session endpoints and reloads after verified session confirmation, so the account UI reads the actual cookie session.
- `window.MyCloverLearnAccount.ensureVerified({returnTo})` is exposed by the account-step module. The dedicated enrollment URL is the simplest sales integration and needs no extra script on the sales page.

## Learning and media

The server catalog supplies the seven main lessons, supporting lessons, application cases, ordering and next/return mappings. Main next links follow `nextLessonId`, not the interleaved supporting list. The last main lesson visibly offers the two optional cases. Additional resource bundles are collapsed separately from files needed for the current lesson.

Media and downloads accept only `/api/learn-media?...` URLs. Players are 16:9, native controls, no autoplay. Current burned-in subtitles do not request an additional SRT track. Future unembedded captions require the server to return `mimeType: text/vtt`. Progress saves playback position periodically; completion is an explicit learner action. No quiz or claim that watching proves mastery is added.

Account changes synchronously clear the current video source and resources; older requests cannot restore their payload afterward. Private course/lesson payloads are not persisted in browser storage.

## Homepage entry

`assets/my-learning-entry.js` inserts “ห้องเรียนของฉัน” only after `/api/learn?action=entry` confirms an enrollment. This endpoint reveals only a boolean, so returning password sessions can see their doorway while lesson content still requires fresh email verification. Guest, no enrollment, failed/malformed requests and logout remove the entry. One module tag is added to `frontdoor/index.html` and `home/index.html`; `index.html` is generated from the frontdoor source with the existing sync tool. No permanent lesson button is added to the public navigation.

## Verification

Run `node --test learn/tests/frontend.test.mjs` (including course, entry and foundation-return cases). Tests use actual frontend modules, mocked DOM and mocked server responses, covering account/lesson races, no-enrollment and pending access, OTP consent and failure, safe redirects/media URLs, enrollment handoff, progress, main/support/case navigation, home source synchronization and static accessibility/mobile rules.

An authorized follow-up used Playwright + temporary Chrome against an isolated HTTPS loopback fixture in `/private/tmp/myclover-learn-qa`. Desktop and 320/375 px screenshots cover guest, registered, main/case lessons, resources, homepage entry and OTP-to-sales handoff; fixture APIs never write a real account or payment. Player fixtures serve the actual local media from the private inventory. The “TEST FIXTURE” badge appears in every screenshot. Results and limitations live beside that fixture, outside public Git.

The live sign-in → enrollment → paid-media endpoint path still requires production integration verification. Google is available on the existing live site; email OTP needs a configured sender. Production schema migration was rejected by automatic approval review and requires explicit database approval before this version is deployed. No real identity, email or payment was created by these tests. Homepage icons missing in the sparse fixture are not evidence of missing files in the full production repository.
