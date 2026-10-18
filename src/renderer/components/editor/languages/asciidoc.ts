import { StreamLanguage, type StringStream } from '@codemirror/language';

interface AsciidocState {
  inListing: boolean;
}

export const asciidocStreamParser = {
  name: 'asciidoc',
  startState(): AsciidocState {
    return { inListing: false };
  },
  token(stream: StringStream, state: AsciidocState): string | null {
    if (stream.sol()) {
      // Delimiters (listing, sidebar, etc.)
      if (stream.match(/^----+|^====+|^....+/)) {
        state.inListing = !state.inListing;
        return 'bracket';
      }
      // Headings: = Document, == Section
      if (stream.match(/^=+\s+/)) {
        return 'heading';
      }
      // Document attributes: :key: value
      if (stream.match(/^:[a-zA-Z0-9_-]+:/)) {
        return 'meta';
      }
      // Block comments: ////
      if (stream.match(/^\/\/\/\/.*/)) {
        return 'comment';
      }
      // Line comments: //
      if (stream.match(/^\/\/.*/)) {
        return 'comment';
      }
    }

    if (state.inListing) {
      stream.skipToEnd();
      return 'monospace';
    }

    // Admonitions: [NOTE], [TIP], [WARNING], [IMPORTANT], [CAUTION] or NOTE:
    if (
      stream.match(/\[(NOTE|TIP|WARNING|IMPORTANT|CAUTION)\]/i) ||
      stream.match(/\b(NOTE|TIP|WARNING|IMPORTANT|CAUTION):/i)
    ) {
      return 'keyword';
    }

    // Anchors: [#id] or [[id]]
    if (stream.match(/\[#[a-zA-Z0-9_-]+\]/) || stream.match(/\[\[[a-zA-Z0-9_-]+\]\]/)) {
      return 'def';
    }

    // Cross references: xref:...[...] or <<anchor,text>> or <<anchor>>
    if (stream.match(/xref:[^[\s]+\[.*?\]/) || stream.match(/<<.*?>>/)) {
      return 'link';
    }

    // Wikilinks: [[...]]
    if (stream.match(/\[\[.*?\]\]/)) {
      return 'link';
    }

    // Inline formatting: *bold*, _italic_, `code`
    if (stream.match(/\*[^\s*]+?\*/)) {
      return 'strong';
    }
    if (stream.match(/_[^\s_]+?_/)) {
      return 'emphasis';
    }
    if (stream.match(/`[^`]+?`/)) {
      return 'string';
    }

    stream.next();
    return null;
  }
};

export const asciidocLanguage = StreamLanguage.define(asciidocStreamParser);
