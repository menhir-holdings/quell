# Quell

Chained OLL / PLL flashcards. One toggle, one Next.

The big picture is the case to execute. Reveal the alg when you need it; check the compounded last-layer after that alg on the cube you already have. Next always chains. If the case still has no name, Next asks for one before moving on.

The name sits in the diagram box, just above the picture — your name if you gave one, otherwise `OLL 13` / `T`. Click it to rename.

### Flow
- **OLL / PLL** — last layer only. Always chained.
- **Top** — the case. **3D** — the cube in your hands.
- **Alg** — tap to reveal the moves; tap again to play.
- **After this alg** — tap to see the last layer you should have.
- **Change** — jump to any case in the current set (diagram + name).
- **Menu** — local accounts. Names (and later training stats) live per account.

Algs follow [SolveTheCube](https://solvethecube.com/algorithms): easy to memoise and turn, built around sexy `(R U R' U')`, sledge `(R' F R F')`, and `(R U R' U)`.

Progress lives in the browser (`localStorage` + IndexedDB) so names survive deploys on the same origin. Space = next, R = reveal alg.

Ship each pass to **https://quellcube.vercel.app**. Do not leave work sitting on a preview.

## Live

- **App:** https://quellcube.vercel.app
- **Linear:** [Quell](https://linear.app/menhir-holdings/project/quell-4c873f24ef7f) — authoritative SoT; see [STATUS.md](./STATUS.md)
- **Repo:** https://github.com/menhir-holdings/quell

## Issues

| ID | Title | Status |
|----|-------|--------|
| [MT-198](https://linear.app/menhir-holdings/issue/MT-198) | Name in diagram, Change case, persist names | Done |
| [MT-197](https://linear.app/menhir-holdings/issue/MT-197) | Single chained flashcard + local accounts | Done |
| [MT-196](https://linear.app/menhir-holdings/issue/MT-196) | Learn unlearned chain states (superseded) | Canceled |
| [MT-195](https://linear.app/menhir-holdings/issue/MT-195) | Practice chaining, unified next | Done |
| [MT-194](https://linear.app/menhir-holdings/issue/MT-194) | STC 2D, alg-card reveal, Learned | Done |
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
- Static alg data + localStorage / IndexedDB accounts

## License

All Rights Reserved © Menhir Holdings
