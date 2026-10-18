import { StreamLanguage, type StringStream } from '@codemirror/language';

interface TypstState {
  inCommentBlock: boolean;
}

export const typstStreamParser = {
  name: 'typst',
  startState(): TypstState {
    return { inCommentBlock: false };
  },
  token(stream: StringStream, state: TypstState): string | null {
    if (state.inCommentBlock) {
      if (stream.match(/.*?\*\//)) {
        state.inCommentBlock = false;
        return 'comment';
      }
      stream.skipToEnd();
      return 'comment';
    }

    // Block comment start
    if (stream.match(/\/\*/)) {
      state.inCommentBlock = true;
      return 'comment';
    }

    // Line comment
    if (stream.match(/\/\/.*/)) {
      return 'comment';
    }

    // Headings: = Heading, == Heading
    if (stream.sol() && stream.match(/^=+\s+/)) {
      return 'heading';
    }

    // Math toggling $ ... $
    if (stream.match(/^\$[^$]*\$/)) {
      return 'string-2';
    }

    // Document directives / keywords: #set, #let, #show, #import, #include, #context, #eval
    if (stream.match(/#(set|let|show|import|include|context|eval)\b/)) {
      return 'keyword';
    }

    // Built-in functions: #link, #align, #image, etc.
    if (stream.match(/#[a-zA-Z0-9_-]+/)) {
      return 'builtin';
    }

    // Labels: <label-name>
    if (stream.match(/<[a-zA-Z0-9_:-]+>/)) {
      return 'def';
    }

    // References: @ref-name
    if (stream.match(/@[a-zA-Z0-9_:-]+/)) {
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

export const typstLanguage = StreamLanguage.define(typstStreamParser);
