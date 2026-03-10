# Contributing to DECK

Thank you for your interest in contributing to DECK.

## How to contribute

1. **Open an issue** — For bugs or feature requests, open a GitHub issue first so we can discuss.
2. **Fork and clone** — Fork the repo and clone it locally.
3. **Create a branch** — Use a descriptive branch name (e.g. `fix/install-script`, `docs/installation`).
4. **Make changes** — Follow the existing code style (ESLint/Prettier in backend and app).
5. **Test** — Run `pnpm install` and `pnpm run build` at the repo root. Manually test install with `./scripts/install.sh` if you changed scripts.
6. **Submit a pull request** — Reference any related issue. Keep PRs focused and reasonably sized.

## Code style

- **Backend:** TypeScript, NestJS conventions. Run `pnpm run lint` in `backend/`.
- **App:** TypeScript/TSX, Vue 3 Composition API. Run `pnpm run lint` in `app/`.

## Documentation

- Root README is in English; Chinese version lives in `docs/README.zh-CN.md`.
- Install and usage docs: `docs/en/` (English) and `docs/zh/` (Chinese). Please update both when changing behavior.

## Release packaging

Maintainers can build a release tarball for GitHub Releases with:

```bash
./scripts/build-release.sh
```

This produces `deck.tar.gz` for release distribution and archive validation.
