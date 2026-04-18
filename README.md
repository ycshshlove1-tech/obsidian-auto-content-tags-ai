# Auto Content Tags for Obsidian

AI-first automatic tagging plugin for Obsidian.

## What it does

- Adds tags automatically when a markdown note is saved
- Uses an OpenAI-compatible API as the main tagging engine
- Keeps the Properties view clean by writing only `tags` to frontmatter
- Stores internal bookkeeping state in plugin data instead of visible note properties
- Can auto-promote frequently repeated AI-generated tags into the candidate list
- Supports Korean-first tagging workflows

## Current design

This version is configured as **AI-only mode**:

- rule-based tagging is disabled
- the AI is the final judge for automatic tags
- frequent new AI tags can be promoted into the candidate list automatically

## Files

- `main.js`: main plugin logic
- `manifest.json`: Obsidian plugin manifest
- `data.example.json`: safe example settings file without secrets

## Important security note

Do **not** upload your real `data.json`. It may contain your API key and local plugin state.

This repository includes only `data.example.json`.

## Installation (manual)

1. Open your Obsidian vault folder
2. Go to `.obsidian/plugins/`
3. Create a folder named `auto-content-tags`
4. Copy `main.js` and `manifest.json` into that folder
5. Optionally copy `data.example.json` and rename it to `data.json`
6. In Obsidian, reload the app
7. Enable the plugin in Community Plugins

## Recommended settings

- Enable AI features: on
- AI tag on save: on
- AI tag mode: `freeform`
- AI is the final judge: on
- Auto-promote frequent AI tags: on
- Promotion threshold: `3`

## How to publish this to GitHub

```bash
cd auto-content-tags-github
git init
git branch -M main
git add .
git commit -m "Initial plugin commit"
git remote add origin https://github.com/YOUR_NAME/YOUR_REPO.git
git push -u origin main
```

## Suggested repo names

- `obsidian-auto-content-tags-ai`
- `auto-content-tags-obsidian`
- `obsidian-ai-korean-tags`

## Notes

This plugin was developed for a personal knowledge vault and tuned toward a Korean note-taking workflow, but the code can be adapted further for more general use.
