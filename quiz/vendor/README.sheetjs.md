# SheetJS Community Edition 0.20.3

Official mini standalone build, downloaded from:
https://cdn.sheetjs.com/xlsx-0.20.3/package/dist/xlsx.mini.min.js

License: Apache-2.0; complete text is retained in LICENSE.sheetjs.
Upstream copyright header and source are unchanged. The only local adaptation is
appending ESM exports for read, write, utils and version.

SHA-256 of the original downloaded standalone bytes: `0cb353f830d7288385492c83d277b058ddeac664ca51cf1393aa1fd3e2b70939`

The quiz importer lazily loads this local module inside a worker for XLSX.
CSV decoding and validation do not load it. Importing files sends no contents
to a server or third-party CDN.
