/** Shared standalone-draft → CMS-body dialect; no I/O or publication behavior. */
export function buildCmsBody(draft) {
  // The reader supplies its own H1, byline, category and key takeaways. Keep
  // those in the standalone draft for review, but not twice in the CMS reader.
  return draft
    .replace(/^# [^\n]+\n+/, '')
    .replace(/^\*\*By [^\n]+\n/gm, '')
    .replace(/^\*\*Category:\*\*[^\n]+\n/gm, '')
    .replace(/^### Key findings\n[\s\S]*?(?=^## )/m, '')
    .replace(/^> Summary:/m, '> **Summary:**')
    .trim() + '\n';
}
