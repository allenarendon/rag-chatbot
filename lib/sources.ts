import catalog from '../data/sources.json';

export type SourceSection = {
  heading: string;
  items: string[];
};

export type SourceEntry = {
  title: string;
  documentType: string;
  reference?: string;
  issued?: string;
  searchable: boolean;
  summary: string;
  topics: string[];
  sections: SourceSection[];
};

export const sourceCatalog = catalog as Record<string, SourceEntry>;

export function sourceEntry(filename: string): SourceEntry | undefined {
  return sourceCatalog[filename];
}

export function embeddingPrefix(filename: string): string {
  const entry = sourceEntry(filename);
  if (!entry) return '';
  return `Document: ${entry.title}. Topics: ${entry.topics.join(', ')}.\n\n`;
}

export function catalogPrompt(): string {
  return Object.entries(sourceCatalog)
    .map(([filename, entry]) => {
      const label = [entry.reference, entry.issued].filter(Boolean).join(', ');
      const availability = entry.searchable
        ? 'Search this document with getInformation.'
        : 'This PDF has no searchable text. Answer from this catalog entry and do not expect getInformation to return its pages.';
      const sections = entry.sections
        .map((section) => `  ${section.heading}: ${section.items.join('; ')}`)
        .join('\n');
      return `- ${entry.title} (${filename})${label ? ` [${label}]` : ''}\n  ${entry.summary} ${availability}\n${sections}`;
    })
    .join('\n');
}
