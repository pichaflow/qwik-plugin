# Changelog

## 0.1.5

### Improved
- Enhanced component UI/UX styling with scoped `picha-` CSS classes, dark mode tokens, thumbnail preview filters, and progress percentage badges.
- Added bulk "Remove all files" and single asset deletion actions.
- Aligned `signatureUrl` and `directory` props in `UploadOptions` invocation context.

## 0.1.4

### Fixed
- Rebuilt SDK to ensure `customUploadEndpoint` fix is included in the dist bundle.

## 0.1.3

### Fixed
- Fixed `customUploadEndpoint` prop not being passed to the SDK upload invocation.

## 0.1.2

### Fixed
- Fixed progress callback state tracking during parallel file uploads.

## 0.1.1

### Added
- Added `signatureUrl` and `customUploadEndpoint` support for proxying and token fetching to fix secret key exposure.

### Fixed
- Fixed 500 crashes swallowing CORS headers in upload-engine.

## 0.1.0

- Initial release
