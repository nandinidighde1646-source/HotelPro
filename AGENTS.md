<!-- LOVABLE:BEGIN -->
> [!IMPORTANT]
> This project is connected to [Lovable](https://lovable.dev). Avoid rewriting
> published git history — force pushing, or rebasing/amending/squashing commits
> that are already pushed — as it rewrites history on Lovable's side and the
> user will likely lose their project history.
>
> Commits you push to the connected branch sync back to Lovable and show up in
> the editor, so keep the branch in a working state.
<!-- LOVABLE:END -->

## Architecture
- Backend is the separate Express + MongoDB app in `server/` (academic MERN requirement); never replace it with Lovable Cloud or server functions.
- The React client talks to it only through `src/lib/api.ts` (Axios); when `VITE_API_URL` is unset it falls back to the labelled browser demo in `src/lib/demo.ts`, which must mirror server rules.
- `src/lib/rules.ts` mirrors `server/src/utils/{pricing,rules}.js` for display; the server stays the source of truth — change both together.
