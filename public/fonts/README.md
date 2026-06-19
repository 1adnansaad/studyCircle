# Local fonts

Drop a font file here (`.ttf`, `.otf`, `.woff`, `.woff2`) and point a font env var
at its public path — Next serves `public/` at the site root, so a file at
`public/fonts/MyFont.ttf` is reachable at `/fonts/MyFont.ttf`.

```bash
# .env  (restart `npm run dev` after changing)
FONT_DISPLAY=/fonts/MyFont.ttf      # headlines + Bengali
FONT_BODY=/fonts/MyBodyFont.ttf     # body / Latin text
```

The family name is derived from the filename, and bold weights are synthesized,
so a single regular file works. For true multiple weights, use a **variable**
font file. Mixing is fine — e.g. a Google family for the body and a local file
for the display, or vice-versa.
