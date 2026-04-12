# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
pnpm dev          # Start dev server at http://localhost:1234
pnpm build        # Type-check (astro check) then build
pnpm preview      # Preview production build
pnpm prettier     # Format all .ts, .tsx, .css, .astro files
```

No test suite is configured for this project.

## Architecture

This is a personal portfolio/blog built with **Astro 5** and **React** (islands architecture). Content is authored in Markdown/MDX and organized into four Astro content collections defined in `src/content.config.ts`:

- **blog** — posts with optional subposts (nested articles under a parent slug)
- **craft** — visual/interactive demos, each with a companion `.astro` component
- **projects** — portfolio work with start/end dates
- **authors** — author profiles linked from blog posts

### Subposts pattern
Blog posts support a nested subpost structure. A post at `src/content/blog/my-post/index.mdx` can have subposts like `src/content/blog/my-post/part-2.mdx`. The `isSubpost(id)` utility detects this by checking for a `/` in the content ID. Subpost navigation, TOC sections, and reading time calculations all handle this hierarchy.

### Data layer (`src/lib/data-utils.ts`)
All content fetching goes through `data-utils.ts`, which wraps `getCollection()` with an in-memory cache to avoid redundant calls during a build. Use the exported functions (`getAllPosts`, `getPostById`, `getAdjacentPosts`, `getTOCSections`, etc.) rather than calling `getCollection()` directly in pages/components.

### Styling
- **Tailwind CSS v4** via `@tailwindcss/vite` (no config file — uses CSS-based configuration)
- Global styles in `src/styles/global.css`, code block overrides in `src/styles/code-block.css`
- `cn()` utility (`clsx` + `tailwind-merge`) lives in `src/lib/utils.ts`
- Theme switching (light/dark) is CSS class-based: `.light` / `.dark` on `<html>`

### Code highlighting
Two systems are in use:
- **astro-expressive-code** for `.astro`/`.mdx` content (configured in `astro.config.ts`)
- **rehype-pretty-code** for plain `.md` markdown

Both use `github-light` / `github-dark` themes. The expressive code theme selector maps class names via `.light` / `.dark` (`themeCssSelector` in config).

### UI components
Radix UI primitives (tooltip, dropdown, scroll area, etc.) with React. Shadcn-style `components.json` is present. Icons are provided by `astro-icon` with the `@iconify-json/lucide` pack and referenced using the `lucide:icon-name` string format.

### Site config
Global constants (site metadata, nav links, social links, tech stack) live in `src/consts.ts`. Update this file to change site-wide values.

### Craft entries
Each craft entry in `src/content/craft/*/` has both an `index.mdx` (description) and a `*.astro` file (the interactive component). The `.astro` component is co-located with the content and imported/rendered in the craft detail page.

### Path alias
`@/` maps to `src/` (configured in `tsconfig.json`).
