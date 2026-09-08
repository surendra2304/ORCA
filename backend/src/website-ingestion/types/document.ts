export interface ExtractedDocument {
  url: string;
  title: string;
  content: string;
  metadata?: {
    language?: string;
    description?: string;
  };
}
