import { StreamLanguage, type StringStream } from '@codemirror/language';

interface OrgState {
  inSrcBlock: boolean;
}

export const orgStreamParser = {
  name: 'org',
  startState(): OrgState {
    return { inSrcBlock: false };
  },
  token(stream: StringStream, state: OrgState): string | null {
    if (stream.sol()) {
      // Directives: #+TITLE:, #+AUTHOR:, etc.
      if (stream.match(/^#\+[a-zA-Z0-9_]+:/i)) {
        return 'meta';
      }
      // Source block delimiter: #+BEGIN_SRC, #+END_SRC
      if (stream.match(/^#\+BEGIN_SRC/i)) {
        state.inSrcBlock = true;
        return 'keyword';
      }
      if (stream.match(/^#\+END_SRC/i)) {
        state.inSrcBlock = false;
        return 'keyword';
      }
      // Headings: * Heading, ** Heading
      if (stream.match(/^\*+\s+/)) {
        return 'heading';
      }
      // Comments: # ...
      if (stream.match(/^#\s+.*/)) {
        return 'comment';
      }
    }

    if (state.inSrcBlock) {
      stream.skipToEnd();
      return 'monospace';
    }

    // TODO / DONE keywords
    if (stream.match(/\b(TODO|DONE|WAITING|CANCELLED)\b/)) {
      return 'keyword';
    }

    // Checkboxes: [ ], [X], [-]
    if (stream.match(/\[[ X-]\]/)) {
      return 'atom';
    }

    // Wikilinks / Org links: [[...][...]] or [[...]]
    if (stream.match(/\[\[.*?\]\]/)) {
      return 'link';
    }

    // Tags: :tag1:tag2:
    if (stream.match(/:[a-zA-Z0-9_-]+:/)) {
      return 'tag';
    }

    // Formatting: *bold*, /italic/, ~code~, =verbatim=
    if (stream.match(/\*[^\s*]+?\*/)) {
      return 'strong';
    }
    if (stream.match(/\/[^\s/]+?\//)) {
      return 'emphasis';
    }
    if (stream.match(/~[^\s~]+?~/)) {
      return 'string';
    }
    if (stream.match(/=[^\s=]+?=/)) {
      return 'string';
    }

    stream.next();
    return null;
  }
};

export const orgLanguage = StreamLanguage.define(orgStreamParser);
