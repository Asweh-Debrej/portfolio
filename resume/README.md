# Resume generator (Muhamad Farhan Syakir)

LaTeX source for the resume PDF served at `/resume.pdf` in the portfolio.

## Files

- `resume.tex` - main source, structured to mirror the original template (heading
  → experience → education → skills → languages → projects → publications → awards).
- `secrets.tex` - phone / email / `\displayphone` macros. **Gitignored** - copy
  `secrets.tex.example` to `secrets.tex` and fill it in on a fresh checkout.
- `Makefile` - `make pdf` compiles `resume.tex` → `output/resume.pdf` and copies
  to `../public/resume.pdf`.

## Build

Requires a LaTeX distribution with `pdflatex` on `PATH` (MiKTeX or TeX Live).

```powershell
# From portfolio/resume/
make pdf
# or, directly:
pdflatex -output-directory=output resume.tex
pdflatex -output-directory=output resume.tex
Copy-Item output/resume.pdf ../public/resume.pdf
```

The double `pdflatex` invocation is required so cross-references (page numbers,
ToC if any) resolve on the second pass.

## Why two copies of the heading?

The contact macros (`\phone`, `\displayphone`, `\email`) live in `secrets.tex`
so the public source can be shared on GitHub without leaking personal contact
info. The same pattern is used in the reference `resume-abil/` template at the
workspace root.
