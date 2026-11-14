/** The slice of an article the Assistant reasons over. Small enough to send to another Worker. */
export interface AssistantArticle {
  id: string;
  slug: string;
  title: string;
  author: string;
  category: string;
  summary: string;
  keyTakeaways: string[];
  /** "identifier (meta)" of the reviewed artifact, when the article has one. */
  artifact: string | null;
}

export interface AssistantInput {
  query: string;
  /** Articles that matched the question. These are what the answer cites. */
  articles: AssistantArticle[];
  /** Records to show the model when nothing matched, so it can say what the archive does hold. */
  context?: AssistantArticle[];
}

export interface AssistantAnswer {
  answer: string;
  mode: 'MODEL' | 'CATALOG';
  notice: string | null;
}

export interface AssistantCitation {
  id: string;
  slug: string;
  title: string;
  author: string;
  category: string;
  url: string;
}
