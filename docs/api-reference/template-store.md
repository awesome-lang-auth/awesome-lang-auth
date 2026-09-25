---
id: template-store
title: "ITemplateStore: Custom Emails and UI i18n"
description: >-
  Implement ITemplateStore to replace built-in transactional emails with your own HTML and to inject per-language strings into the built-in auth UI.
sidebar_label: ITemplateStore
---

# ITemplateStore

`ITemplateStore` is the optional interface that powers the **dynamic email template** and **UI i18n** systems in awesome-node-auth. Implement it against your database to:

- Override any built-in transactional email (password reset, magic link, welcome, etc.) with custom HTML/text and per-language translations
- Inject page-specific UI translation strings into the built-in login/register pages at render time

---

## Types

### `MailTemplate`

```typescript
export interface MailTemplate {
  /** Template identifier. Built-in IDs: 'magic-link' | 'password-reset' | 'verify-email' | 'welcome' | 'email-changed' | 'invitation' */
  id: string;

  /** HTML body. Use {{T.key}} for translated strings and {{VAR}} for data variables. Leave empty to use the built-in fallback template. */
  baseHtml: string;

  /** Plain-text fallback body. Same placeholder syntax. Leave empty to use the built-in fallback template. */
  baseText: string;

  /** Per-language translation map: lang → { key: value } */
  translations: Record<string, Record<string, string>>;
}
```

### `UiTranslation`

```typescript
export interface UiTranslation {
  /** Page identifier. Built-in pages: 'login' | 'register' | 'forgot-password' | 'reset-password' | 'magic-link' | 'verify-email' | '2fa' | 'link-verify' | 'account-conflict' */
  page: string;

  /** Per-language translation map: lang → { data-i18n-key: text } */
  translations: Record<string, Record<string, string>>;
}
```

---

## Interface definition

```typescript
export interface ITemplateStore {
  /** Retrieve a mail template by ID. Returns null if not found (built-in fallback is used). */
  getMailTemplate(id: string): Promise<MailTemplate | null>;

  /** List all stored mail templates. */
  listMailTemplates(): Promise<MailTemplate[]>;

  /** Create or update a mail template. */
  updateMailTemplate(id: string, template: Partial<MailTemplate>): Promise<void>;

  /** Retrieve UI translations for a specific page. Returns null if not found. */
  getUiTranslations(page: string): Promise<UiTranslation | null>;

  /** List all stored UI translation sets. */
  listUiTranslations(): Promise<UiTranslation[]>;

  /** Create or update UI translations for a page. */
  updateUiTranslations(page: string, translations: Record<string, Record<string, string>>): Promise<void>;
}
```

---

## Built-in implementation

`MemoryTemplateStore` is a zero-dependency in-memory implementation ready for development and testing:

```typescript
import { MemoryTemplateStore } from '@awesome-lang-auth/node';

const templateStore = new MemoryTemplateStore();
```

Replace it with a database-backed implementation in production (see [Mailer → Dynamic templates](/docs/advanced/mailer#dynamic-templates-with-itemplatestore)).

---

## Wiring

Pass `templateStore` to **both** `AuthConfigurator` and `createAdminRouter`:

```typescript
import { AuthConfigurator, createAdminRouter, MemoryTemplateStore, buildUiRouter } from '@awesome-lang-auth/node';

const templateStore = new MemoryTemplateStore();

const auth = new AuthConfigurator(
  {
    // ... JWT secrets & mailer config ...
    templateStore,   // ← enables dynamic email templates
  },
  userStore,
);

// (optional) Enable i18n injection into built-in UI pages
app.use('/auth/ui', buildUiRouter({
  authConfig,
  apiPrefix:     '/auth',
  templateStore,
}));

// (optional) Enable the 📧 Email & UI tab in the Admin Panel
app.use('/admin', createAdminRouter(userStore, {
  accessPolicy: 'first-user',
  jwtSecret: process.env.ACCESS_TOKEN_SECRET!,
  templateStore,
}));
```

---

## Interpolation reference

### Email templates

| Syntax | Source | Example output |
|--------|--------|----------------|
| `{{T.key}}` | `MailTemplate.translations[lang][key]` | `"Reset your password"` |
| `{{link}}` | Reset / magic-link / verify URL | `"https://app.com/reset?token=…"` |
| `{{token}}` | Raw token (rarely needed in template HTML) | `"abc123…"` |
| `{{newEmail}}` | New email address (`email-changed` template) | `"new@example.com"` |
| `{{loginUrl}}` | Login page URL (`welcome` template) | `"https://app.com/login"` |
| `{{tempPassword}}` | Temporary password (`welcome` template, admin-created users) | `"Tmp@1234"` |

A missing key renders as `[key]` to help with debugging.

> **Reset to default:** save a template with empty `baseHtml` and `baseText` (or use the
> "Reset to default" button in the admin panel) and `MailerService` will automatically fall
> back to the built-in template for that ID.

### UI translations

Each `data-i18n` attribute value on a built-in HTML element is looked up in `UiTranslation.translations[lang]`. The key must exactly match the attribute value:

```html
<h2 data-i18n="title">Sign in</h2>
<!-- resolved by: translations["en"]["title"] → "Sign in" -->
```

---

## Admin REST API

When `templateStore` is provided to `createAdminRouter`, the following endpoints are activated:

| Method | Path | Description |
|--------|------|-------------|
| `GET` | `/admin/api/templates/mail` | List all mail templates |
| `POST` | `/admin/api/templates/mail` | Create or update a mail template (body: `{ id, baseHtml, baseText, translations }`) |
| `GET` | `/admin/api/templates/ui` | List all UI translation sets |
| `POST` | `/admin/api/templates/ui` | Create or update UI translations (body: `{ page, translations }`) |
