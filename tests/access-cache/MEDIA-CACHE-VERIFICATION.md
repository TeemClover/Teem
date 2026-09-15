# Private video cache verification — 2026-09-15

Production verification is pending. These results describe one local browser
session; they do not establish support in every browser or measure production
network, database, or storage latency.

## Setup

The native in-app browser opened a local HTTP fixture using the current
`createLearnMediaHandler` and `authorizeLearnMedia`. The fixture supplied an
isolated in-memory account and registry, and streamed two existing local,
fast-start MP4s. It did not use a production account, database, or remote storage.
Browser cache remained enabled. Reload controls removed and recreated the native
video element with the same URL, rather than retaining the old player buffer.

## Observed requests

| Action | HTTP result | Response body bytes written | Fresh authorization reads |
| --- | --- | ---: | ---: |
| First open of EP09 | 206, complete video range | 1,105,357 | 1 |
| Reload EP09 | 304, existing bytes reused | 0 | 1 |
| First open of FOUNDATION | 206, first 4 MiB | 4,194,304 | 1 |
| Return to EP09 | 304, existing bytes reused | 0 | 1 |
| Reload FOUNDATION | 304, first range reused | 0 | 1 |
| FOUNDATION requests its next range with matching `If-Range` | 206, correct next 4 MiB range; browser canceled during transfer | 458,752 before cancellation | 1 |
| Revoke fixture access, then reopen cached EP09 | 403, JSON denial | 220; no video bytes | 1 |
| Log out fixture, then reopen cached EP09 | 401, JSON denial | 120; no video bytes | 0; missing session rejected before SQL |

The three 304 responses avoided retransmitting 6,405,018 video bytes in this
session. Each still performed fresh authorization. The aborted continuation is
evidence of correct range selection, not a completed download of that range.

Successful videos returned a strong SHA-256 ETag, `Vary: Cookie`, and
`Cache-Control: private, max-age=0, must-revalidate`. Shared CDN storage remained
disabled. The revoked and logged-out responses returned `private, no-store`
without ETag; a known cached ETag did not grant access. Documents and captions
retain their existing `no-store` behavior.

## Automated checks and limits

At this media-change checkpoint, the complete learn suite passed **212/212**
tests, including **46** focused media/auth/foundation tests. Cases include fresh
revocation and logout, account and asset boundaries, registry failures, matching
and stale validators, conditional HEAD, weak/list ETags, `If-Match` precedence,
`If-Range` mismatch fallback, streaming before the full body arrives, and
non-cacheable error responses.

First-time transfers still require video bytes. Repeat transfers retain an
authorization round trip. Browser cache eviction, changed cookies, or browsers
that do not retain partial responses can reduce the benefit. This local result
does not claim production timing improvements or universal browser behavior.

The read-only deployment smoke test additionally checks the four review UI
assets, the private shelf catalog, and two exact public marketing videos. Video
checks use HEAD, conditional HEAD, and a range of at most 64 KiB; a response that
ignores Range is canceled instead of downloading the whole video.
