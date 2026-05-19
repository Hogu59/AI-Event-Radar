// Rule-based AI keyword classifier.
// Precision-first per PLANNING.md 5.2 (target precision >= 85%).

export interface ClassifyInput {
  title: string;
  description?: string | null;
  raw_categories?: string[];
  host_name?: string | null;
}

export interface ClassifyResult {
  is_ai_related: boolean;
  keywords_matched: string[]; // canonical form
  categories: string[];       // grouped category labels
}

// Keyword dictionary: { canonical: [alias regexes (case-insensitive)] }
// Categories are derived from the canonical buckets below.
const KEYWORDS: Record<string, string[]> = {
  // Core AI/ML
  AI: ['ai', '인공지능', 'artificial intelligence'],
  ML: ['ml', 'machine learning', '머신러닝', '머신 러닝', '기계학습'],
  'Deep Learning': ['deep learning', '딥러닝', '딥 러닝'],
  MLOps: ['mlops', 'ml ops'],
  // LLMs and generative
  LLM: ['llm', 'large language model', '대규모 언어'],
  GPT: ['gpt', 'gpt-4', 'gpt-5', 'chatgpt'],
  Claude: ['claude'],
  Gemini: ['gemini'],
  Llama: ['llama', 'meta-llama'],
  'Generative AI': ['generative ai', 'generative', '생성형', '생성ai', 'genai'],
  Diffusion: ['diffusion', 'stable diffusion', 'sora'],
  Transformer: ['transformer'],
  // Agents and RAG
  Agent: ['agent', 'agents', 'agentic', '에이전트'],
  RAG: ['rag', 'retrieval augmented', 'retrieval-augmented'],
  LangChain: ['langchain', 'langgraph'],
  LlamaIndex: ['llamaindex', 'llama-index'],
  'Vector DB': ['vector db', 'vector database', '벡터', 'pinecone', 'weaviate', 'qdrant', 'chroma'],
  // CV/NLP/Speech
  NLP: ['nlp', 'natural language processing', '자연어'],
  'Computer Vision': ['computer vision', 'cv ', '비전', 'vision ai'],
  Speech: ['speech', 'tts', 'asr', '음성ai'],
  // Hackathon / competition
  Hackathon: ['hackathon', '해커톤', 'hack day', 'hackday'],
  Conference: ['conference', '컨퍼런스', '콘퍼런스', 'summit'],
  Meetup: ['meetup', '밋업', '모임'],
  Workshop: ['workshop', '워크샵', '워크숍'],
  Webinar: ['webinar', '웨비나'],
  // Data
  'Data Science': ['data science', '데이터 사이언스', '데이터과학'],
  'Data Engineering': ['data engineering', '데이터 엔지니어'],
  // Infra / platforms (only AI-leaning)
  HuggingFace: ['hugging face', 'huggingface'],
  PyTorch: ['pytorch'],
  TensorFlow: ['tensorflow'],
  OpenAI: ['openai'],
  Anthropic: ['anthropic'],
};

// AI categories (any match in these canonical keys => is_ai_related = true).
const AI_CANONICAL = new Set<string>([
  'AI',
  'ML',
  'Deep Learning',
  'MLOps',
  'LLM',
  'GPT',
  'Claude',
  'Gemini',
  'Llama',
  'Generative AI',
  'Diffusion',
  'Transformer',
  'Agent',
  'RAG',
  'LangChain',
  'LlamaIndex',
  'Vector DB',
  'NLP',
  'Computer Vision',
  'Speech',
  'Data Science',
  'HuggingFace',
  'PyTorch',
  'TensorFlow',
  'OpenAI',
  'Anthropic',
]);

// Canonical -> category grouping
const CATEGORY_GROUP: Record<string, string> = {
  AI: 'AI',
  ML: 'ML',
  'Deep Learning': 'ML',
  MLOps: 'MLOps',
  LLM: 'LLM',
  GPT: 'LLM',
  Claude: 'LLM',
  Gemini: 'LLM',
  Llama: 'LLM',
  'Generative AI': 'GenAI',
  Diffusion: 'GenAI',
  Transformer: 'ML',
  Agent: 'Agent',
  RAG: 'RAG',
  LangChain: 'Agent',
  LlamaIndex: 'RAG',
  'Vector DB': 'RAG',
  NLP: 'NLP',
  'Computer Vision': 'Vision',
  Speech: 'Speech',
  Hackathon: 'Hackathon',
  Conference: 'Conference',
  Meetup: 'Meetup',
  Workshop: 'Workshop',
  Webinar: 'Webinar',
  'Data Science': 'Data',
  'Data Engineering': 'Data',
  HuggingFace: 'Tools',
  PyTorch: 'Tools',
  TensorFlow: 'Tools',
  OpenAI: 'Tools',
  Anthropic: 'Tools',
};

function escapeRegex(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

const COMPILED: { canonical: string; re: RegExp }[] = Object.entries(KEYWORDS).flatMap(
  ([canonical, aliases]) =>
    aliases.map((alias) => ({
      canonical,
      // word-ish boundary: looser for Korean (no \b), so use lookarounds for ascii alnum.
      re: new RegExp(`(?<![A-Za-z0-9])${escapeRegex(alias)}(?![A-Za-z0-9])`, 'i'),
    })),
);

export function classifyEvent(input: ClassifyInput): ClassifyResult {
  const haystack = [
    input.title,
    input.description ?? '',
    (input.raw_categories ?? []).join(' '),
    input.host_name ?? '',
  ]
    .join('\n')
    .normalize('NFKC');

  const matchedCanonical = new Set<string>();
  for (const { canonical, re } of COMPILED) {
    if (matchedCanonical.has(canonical)) continue;
    if (re.test(haystack)) matchedCanonical.add(canonical);
  }

  const keywords_matched = [...matchedCanonical].sort();

  const categories = [
    ...new Set(
      keywords_matched
        .map((k) => CATEGORY_GROUP[k])
        .filter((c): c is string => Boolean(c)),
    ),
  ].sort();

  const is_ai_related = [...matchedCanonical].some((k) => AI_CANONICAL.has(k));

  return { is_ai_related, keywords_matched, categories };
}
