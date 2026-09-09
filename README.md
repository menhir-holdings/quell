# Quell

Learn full OLL and PLL by practicing the cases you keep.

Two lists: **Learn** (not in rotation yet) and **Practice** (the ones you are drilling). Name a case whatever helps you remember it — that name shows on the case screen and on the selection grid.

### Flow
- **OLL / PLL** — last layer only.
- **Learn** — pick a case, optional custom name, mark it **Learned** to move it into practice.
- **Practice → Feed** — endless random from your practice list.
- **Practice → Select** — hit a specific case from the grid.

Each case screen: your name, last-layer view (**Top** in SolveTheCube style — yellow vs grey for OLL, arrows for PLL — or **3D** with unused stickers greyed), the setup alg from the base state (solved for PLL, last layer oriented / F2L done for OLL), and a solve card you tap to reveal.

Algs follow [SolveTheCube](https://solvethecube.com/algorithms): easy to memoise and turn, built around sexy `(R U R' U')`, sledge `(R' F R F')`, and `(R U R' U)`.

Progress lives in the browser (`localStorage`). Space = next in feed, R = reveal.

## Live

- **App:** https://quellcube.vercel.app
- **Linear:** [Quell](https://linear.app/menhir-holdings/project/quell-4c873f24ef7f) — authoritative SoT; see [STATUS.md](./STATUS.md)
- **Repo:** https://github.com/menhir-holdings/quell

## Issues

| ID | Title | Status |
|----|-------|--------|
| [MT-194](https://linear.app/menhir-holdings/issue/MT-194) | STC 2D, alg-card reveal, Learned | In progress |
| [MT-193](https://linear.app/menhir-holdings/issue/MT-193) | OLL/PLL learn + practice UX | Done |
| [MT-192](https://linear.app/menhir-holdings/issue/MT-192) | v1 trainer (superseded UX) | Closed |

## Develop

```bash
npm install
npm run dev
```

## Stack

- Vite + TypeScript
- `cubing` (TwistyPlayer) as an MPL library
- Static alg data + localStorage progress

## License

All Rights Reserved © Menhir Holdings
