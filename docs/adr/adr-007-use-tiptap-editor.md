# Use Tiptap for Rich Text Editing

We will use **Tiptap** via the `@flogeez/angular-tiptap-editor` package as the rich text editor for text fields that require formatting (such as event descriptions).

## Context

The admin interface requires a rich text editor for creating and editing fields that need rich text formatting (currently event descriptions, potentially others in the future). The editor must:
- Provide a familiar WYSIWYG experience (bold, headings, lists, etc.)
- Output HTML that renders consistently on the public-facing site
- Integrate well with Angular (standalone components, signals)
- Support internationalization (i18n)

## Considered Alternatives

*   **Plain textarea**: Rejected because it provides no formatting capabilities and requires users to write raw HTML.

*   **ngx-tiptap**: This is the more established Angular wrapper for Tiptap. Rejected because it requires manual configuration of the editor, toolbar, and extensions. The `@flogeez/angular-tiptap-editor` package provides a pre-built, full-featured editor with toolbar, i18n support, and opinionated defaults.

*   **Quill.js (ngx-quill)**: Rejected because Tiptap is more modern, headless, and extensible. It uses ProseMirror under the hood, which is well-maintained and widely used.

*   **TinyMCE / CKEditor**: Rejected as they are commercial products with licensing concerns and provide more complexity than needed for this use case.

## Decision

We will use `@flogeez/angular-tiptap-editor` as the rich text editor.

### Why this specific package:

1.  **Angular-native**: Built specifically for Angular 18+ with standalone components, signals, and modern Angular patterns.

2.  **Pre-built UI**: Provides a complete toolbar with formatting options (headings, bold, italic, lists, links, etc.) out of the box—no need to build custom toolbar components.

3.  **i18n support**: Built-in internationalization for toolbar labels, making it easy to support multiple languages.

4.  **Rich feature set**: Includes bubble menus, slash commands, image handling, tables, and more—features that would require significant custom implementation in other solutions.

5.  **Active development**: The package is actively maintained and compatible with modern Angular versions.

### Supporting packages:

*   `@tiptap/core` & `@tiptap/starter-kit`: Core Tiptap dependencies required by the Angular wrapper.
*   `@fontsource/material-symbols-outlined`: Icon font for toolbar icons (required peer dependency).
*   `tippy.js`: Tooltip positioning library (required peer dependency).
*   `@tailwindcss/typography`: Used to style the rendered HTML output on the public site, ensuring the editor and rendered view share identical styling via the `prose` class.

## Consequences

*   **Positive**: 
    *   Editor and rendered output now share styling via Tailwind Typography's `prose` class.
    *   Users get a professional-grade editor with minimal configuration.
    *   Consistent look between admin editing and public display.
    *   The same editor can be reused for other rich text fields in the future.

*   **Negative**:
    *   Bundle size increased by ~13KB (from 19KB to 37KB stylesheet).
    *   Additional npm dependencies required.
    *   The package is relatively new compared to alternatives.

*   **Neutral**:
    *   Rich text is stored as HTML in the database.
