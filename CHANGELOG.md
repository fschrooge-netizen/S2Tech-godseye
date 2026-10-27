# Changelog

All notable user-facing changes to this project will be documented here.
Format: Keep a Changelog. Versioning: Semantic Versioning.

## [Unreleased]

### Added
- Add a permission-gated SANRAL i-TRAFFIC camera catalogue adapter for South African road-camera still images.
- Include source status and imported-count metadata in the existing CCTV catalogue response.
- Document South African camera provider sources, reuse restrictions and activation requirements.

### Changed
- Count cameras as verified only when the feed explicitly carries a verified status.

### Deprecated

### Removed

### Fixed

### Security
- Keep the SANRAL developer key server-side and never call its catalogue until written republication permission has been recorded and the gate is enabled.
- Reject untrusted camera image URLs and unsupported coordinates before exposing camera entries.
