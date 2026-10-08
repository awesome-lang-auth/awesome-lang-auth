---
id: ai-assistants
title: Use the docs with AI assistants
description: >-
  Give an AI assistant the awesome-lang-auth docs: llms.txt indexes every page with absolute URLs, llms-full.txt holds them all in one Markdown file.
---

# Use the docs with AI assistants

The site publishes its documentation as two plain-text files for AI assistants, in the [llms.txt format](https://llmstxt.org). Both are generated from the documentation on every build of the site, so they match the pages you read here.

- **`llms.txt`**, at [https://awesomelangauth.com/llms.txt](https://awesomelangauth.com/llms.txt): an index of every documentation page, with its title, its absolute URL and a one-line summary.
- **`llms-full.txt`**, at [https://awesomelangauth.com/llms-full.txt](https://awesomelangauth.com/llms-full.txt): the text of every documentation page in a single Markdown file. Links in it that start with `/` are relative to `https://awesomelangauth.com`.

## Give them to an assistant

- **Paste the URL into the chat.** If the assistant can open web pages, it can read `llms.txt` and then open the pages it lists, or read `llms-full.txt` directly.
- **Paste or attach the file.** Save `llms-full.txt` (or `llms.txt`) and add it to the conversation, so the assistant has the documentation even when it cannot open web pages.
- **Add the URL as a documentation source.** In tools that let you add documentation by URL, add one of the two URLs above.

`llms-full.txt` contains every page, so it is large (several hundred kilobytes). If an assistant cannot take it whole, give it `llms.txt` and the pages you need.

## The hosted MCP server

An MCP server hosted by this site used to connect AI editors to the documentation through an API key. That server [is being retired](/docs/mcp-server): `llms.txt` and `llms-full.txt` replace it for AI-assisted setup, with no account and no key.
