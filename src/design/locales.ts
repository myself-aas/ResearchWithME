// These are UI catalogs, not a claim that article translations/routes exist.
const en = {
  'writing.empty': 'No articles published yet.',
  'topics.empty': 'No topics defined yet.',
  'datasets.empty': 'No standalone datasets published yet.',
  'assistant.empty': 'No archive questions available yet. Search the archive instead.',
  'status.localLive': 'Local only',
  'status.verified': 'Verified', 'status.pending': 'Pending', 'status.unavailable': 'Unavailable',
} as const;
const bn: Record<keyof typeof en, string> = {
  'writing.empty': 'এখনও কোনো প্রবন্ধ প্রকাশিত হয়নি।',
  'topics.empty': 'এখনও কোনো বিষয় নির্ধারিত হয়নি।',
  'datasets.empty': 'এখনও কোনো স্বতন্ত্র ডেটাসেট প্রকাশিত হয়নি।',
  'assistant.empty': 'এখনও প্রশ্ন পাওয়া যায়নি। সংরক্ষণাগারে খুঁজুন।',
  'status.localLive': 'শুধু এই ডিভাইসে',
  'status.verified': 'যাচাইকৃত', 'status.pending': 'অপেক্ষমাণ', 'status.unavailable': 'অনুপলব্ধ',
};
export const locales = { en, bn } as const;
