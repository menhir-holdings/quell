# Quell

**2-look is done. Full CFOP from here.**

3x3 drill trainer for moving off 2-look OLL/PLL. One case per deal: 3D cube, indicated hold (U/F colors), scramble, click-to-reveal step algs.

### Modes
- **OLL** — 57 cases. Default skips the 7 OCLLs you already 2-look.
- **PLL** — 21 cases. Default skips EPLL + CPLL (Ua/Ub/H/Z + Aa/Ab/E).
- **2-gen** — RU scramble from solved; F2L on R is broken. Reveal is the inverse (stay on R and U).
- **Full** — WCA random-state scramble. No single-step alg.
- **F2L** — cross done, 1–4 pairs left. Reveal is the first insertion.

Hold is color-neutral by default (one of 24 orientations, shown as U/F sticker colors). Space = next, R = reveal. Shift-click a case cell to cycle unseen → learning → known.

## Live

- **Linear:** [Quell](https://linear.app/menhir-holdings/project/quell-4c873f24ef7f) — authoritative SoT; see [STATUS.md](./STATUS.md)
- **Repo:** https://github.com/menhir-holdings/quell

## Issues

| ID | Title | Status |
|----|-------|--------|
| [MT-192](https://linear.app/menhir-holdings/issue/MT-192) | v1 trainer — OLL/PLL/2-gen/F2L/full | In Progress |

## Develop

```bash
npm install
npm run dev
```

## Stack

- Vite + TypeScript
- `cubing` (TwistyPlayer + WCA scrambles) as an MPL library
- Static alg data + localStorage progress

## License

All Rights Reserved © Menhir Holdings
