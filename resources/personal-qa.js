const statusEl = document.getElementById("qaStatus");
const outputEl = document.getElementById("qaOutput");
const inputEl = document.getElementById("qaInput");
const askButtonEl = document.getElementById("qaAskButton");

const refusalText =
  "I can only answer questions about Aashutosh Shrestha based on this website and resume.";

const assistantIdentityText =
  "I am only the AI assistant of Aashutosh Shrestha. Please ask questions regarding him.";

const personalKeywords = [
  "aashutosh",
  "you",
  "your",
  "he",
  "his",
  "him",
  "they",
  "their",
  "them",
  "live",
  "lives",
  "location",
  "located",
  "based",
  "from",
  "born",
  "birth",
  "dob",
  "age",
  "ideology",
  "leftist",
  "hobby",
  "hobbies",
  "movie",
  "books",
  "documentary",
  "games",
  "quiz",
  "speech",
  "competition",
  "experience",
  "skills",
  "education",
  "projects",
  "fenrir",
  "teslatech",
  "outcode",
  "qpay",
  "freelance",
  "osaka",
  "kathmandu",
  "resume",
  "contact",
  "available",
  "availability",
  "hire",
  "proposal",
  "project proposal",
  "collaboration",
  "work",
  "career",
  "focus",
  "backend",
  "website",
  "web",
  "llm",
  "software engineer",
  "sdlc",
  "languages",
  "degree"
];

const blockedGeneralTopics = [
  "weather",
  "news",
  "bitcoin",
  "stocks",
  "recipe",
  "sports",
  "math",
  "code this",
  "write a poem"
];

let generator = null;
let loadingModel = null;

async function loadTransformersModule() {
  const cdnSources = [
    "https://cdn.jsdelivr.net/npm/@xenova/transformers@2.17.2",
    "https://unpkg.com/@xenova/transformers@2.17.2"
  ];

  let lastError = null;
  for (const source of cdnSources) {
    try {
      return await import(source);
    } catch (error) {
      lastError = error;
    }
  }

  throw lastError || new Error("Unable to load transformers module from CDN.");
}

function normalize(text) {
  return (text || "").toLowerCase().replace(/[^a-z0-9\s]/g, " ");
}

function tokenize(text) {
  return normalize(text)
    .split(/\s+/)
    .filter(Boolean)
    .filter((token) => token.length > 2);
}

function isAboutAashutosh(question) {
  const q = normalize(question);
  if (!q) {
    return false;
  }

  const hasPersonalKeyword = personalKeywords.some((keyword) => q.includes(keyword));
  const hasBlockedTopic = blockedGeneralTopics.some((topic) => q.includes(topic));

  return hasPersonalKeyword && !hasBlockedTopic;
}

function retrieveContext(question, topN = 5) {
  const kb = Array.isArray(window.AASHUTOSH_PROFILE_KB) ? window.AASHUTOSH_PROFILE_KB : [];
  const qTokens = tokenize(question);

  const scored = kb
    .map((entry) => {
      const eTokens = tokenize(entry);
      let score = 0;
      for (const token of qTokens) {
        if (eTokens.includes(token)) {
          score += 2;
        }
        if (entry.toLowerCase().includes(token)) {
          score += 1;
        }
      }
      return { entry, score };
    })
    .sort((a, b) => b.score - a.score);

  const best = scored.filter((item) => item.score > 0).slice(0, topN).map((item) => item.entry);
  if (best.length) {
    return best;
  }
  return kb.slice(0, topN);
}

function includesAny(text, words) {
  return words.some((word) => text.includes(word));
}

function isDirectedAtAssistant(question) {
  const q = normalize(question);

  const directYouPatterns = [
    /\bwho are you\b/,
    /\bwhat are you\b/,
    /\babout you\b/,
    /\byourself\b/,
    /\byour\b/,
    /\bare you\b/,
    /\bdo you\b/,
    /\bwhere do you\b/,
    /\bhow are you\b/
  ];

  return directYouPatterns.some((pattern) => pattern.test(q));
}

function preciseAnswer(answer) {
  const text = (answer || "").trim();
  if (!text || text === refusalText) {
    return text;
  }

  const lines = text
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean)
    .slice(0, 3);

  const compact = lines.join(" ");
  const sentences = compact.split(/(?<=[.!?])\s+/).filter(Boolean).slice(0, 2);
  return sentences.length ? sentences.join(" ") : compact;
}

function getDirectAnswer(question) {
  const q = normalize(question);
  const profile = window.AASHUTOSH_PROFILE || {};

  if (includesAny(q, ["how is he", "how is aashutosh", "how are they", "what kind of", "tell me about him", "tell me about them", "personality", "strengths"])) {
    const strengths = Array.isArray(profile.strengths) ? profile.strengths : [];
    const strengthsText = strengths.length
      ? strengths.join("; ")
      : "high adaptability, strong productivity under pressure, strong communication, and strong research";
    return `Aashutosh is a highly capable engineer with ${strengthsText}. He communicates clearly across teams and applies strong research skills to deliver practical, data-informed outcomes.`;
  }

  if (includesAny(q, ["title", "role", "who is he", "profession", "what does he do"])) {
    if (profile.title) {
      return `Aashutosh Shrestha is a ${profile.title}.`;
    }
  }

  if (includesAny(q, ["main focus", "focus", "specialize", "specialise", "specialty", "speciality"])) {
    return "His main focus is mobile app engineering, and he also has experience with LLM integration, website development, backend development, and SDLC.";
  }

  if (includesAny(q, ["ideology", "political", "leftist", "left wing"])) {
    if (profile.ideology) {
      return `His ideology is ${profile.ideology.toLowerCase()}.`;
    }
  }

  if (includesAny(q, ["ieee", "paper", "research paper", "publication", "published"])) {
    if (profile.research && profile.research.ieeeReferencedPaper) {
      return "One of his papers is referenced in IEEE.";
    }
  }

  if (includesAny(q, ["google scholar", "scholar profile", "citations", "profile id"])) {
    if (profile.scholarProfile) {
      return `Google Scholar profile: ${profile.scholarProfile}`;
    }
  }

  if (includesAny(q, ["born", "birthplace", "from where", "where from"])) {
    if (profile.birthplace && profile.dob) {
      return `Aashutosh Shrestha was born in ${profile.birthplace} on ${profile.dob}.`;
    }
    if (profile.birthplace) {
      return `Aashutosh Shrestha was born in ${profile.birthplace}.`;
    }
  }

  if (includesAny(q, ["dob", "date of birth", "birthday"])) {
    if (profile.dob) {
      return `His date of birth is ${profile.dob}.`;
    }
  }

  if (includesAny(q, ["where", "live", "based", "location", "located"])) {
    if (profile.location) {
      return `Aashutosh Shrestha is based in ${profile.location}.`;
    }
  }

  if (includesAny(q, ["email", "contact", "reach", "phone", "call"])) {
    const email = profile.contact && profile.contact.email ? profile.contact.email : "N/A";
    return `You can contact Aashutosh at ${email}.`;
  }

  if (includesAny(q, ["available", "availability", "hire", "project", "proposal", "collaboration", "work with"])) {
    const email = profile.contact && profile.contact.email ? profile.contact.email : "N/A";
    return `He is available to work on projects. For any proposal, contact him at ${email}.`;
  }

  if (includesAny(q, ["hobby", "hobbies", "likes", "love", "free time", "movies", "books", "documentaries", "games", "gaming", "eat"])) {
    const hobbies = profile.personalLife && Array.isArray(profile.personalLife.hobbies) ? profile.personalLife.hobbies : [];
    const likes = profile.personalLife && Array.isArray(profile.personalLife.likes) ? profile.personalLife.likes : [];
    const joined = [...new Set([...likes, ...hobbies])];
    if (joined.length) {
      return `He enjoys ${joined.join(", ")}.`;
    }
  }

  if (includesAny(q, ["school", "quiz", "speech", "competition", "competitions", "achievement"])) {
    if (profile.personalLife && profile.personalLife.schoolAchievements) {
      return profile.personalLife.schoolAchievements;
    }
  }

  if (includesAny(q, ["years", "experience", "how long"])) {
    return "He has over 6 years of professional software engineering experience.";
  }

  if (includesAny(q, ["latest projects", "recent projects", "projects", "what did he build"])) {
    if (Array.isArray(profile.projects) && profile.projects.length > 0) {
      return `Notable projects include ${profile.projects.slice(0, 5).join("; ")}.`;
    }
  }

  if (includesAny(q, ["current", "now", "work", "working", "job"])) {
    if (Array.isArray(profile.experience) && profile.experience.length > 0) {
      return profile.experience[0];
    }
  }

  if (includesAny(q, ["skill", "stack", "technology", "tech"])) {
    if (Array.isArray(profile.skills) && profile.skills.length > 0) {
      return `Core skills include ${profile.skills.slice(0, 12).join(", ")}.`;
    }
  }

  if (includesAny(q, ["education", "degree", "university", "college"])) {
    if (Array.isArray(profile.education) && profile.education.length > 0) {
      return profile.education[0];
    }
  }

  return "";
}

async function ensureModelLoaded() {
  if (generator) {
    return generator;
  }

  if (loadingModel) {
    return loadingModel;
  }

  loadingModel = (async () => {
    statusEl.textContent = "Model status: Loading lightweight browser model...";
    const { pipeline, env } = await loadTransformersModule();
    env.allowLocalModels = false;
    env.useBrowserCache = true;

    generator = await pipeline("text2text-generation", "Xenova/flan-t5-small");
    statusEl.textContent = "Model status: Ready (running in your browser)";
    return generator;
  })();

  return loadingModel;
}

function fallbackAnswer(question) {
  const context = retrieveContext(question, 1);
  return preciseAnswer(context[0] || refusalText);
}

async function answerQuestion() {
  const question = inputEl.value.trim();
  if (!question) {
    outputEl.textContent = "Please ask a question about Aashutosh Shrestha.";
    return;
  }

  if (isDirectedAtAssistant(question)) {
    outputEl.textContent = assistantIdentityText;
    statusEl.textContent = "Model status: Ready (assistant guidance)";
    return;
  }

  if (!isAboutAashutosh(question)) {
    outputEl.textContent = refusalText;
    return;
  }

  const directAnswer = getDirectAnswer(question);
  if (directAnswer) {
    outputEl.textContent = preciseAnswer(directAnswer);
    statusEl.textContent = "Model status: Ready (direct profile answer)";
    return;
  }

  askButtonEl.disabled = true;
  statusEl.textContent = "Model status: Thinking...";
  outputEl.textContent = "Generating answer...";

  try {
    const model = await ensureModelLoaded();
    const contextItems = retrieveContext(question, 6);
    const prompt = [
      "You are the website assistant for Aashutosh Shrestha.",
      "You must ONLY answer questions about Aashutosh Shrestha.",
      "If the answer is not in context, reply exactly:",
      refusalText,
      "Answer exactly what is asked, with no extra details.",
      "Use 1-2 short sentences in plain text.",
      "Context:",
      ...contextItems.map((item) => `- ${item}`),
      `Question: ${question}`,
      "Answer:"
    ].join("\n");

    const response = await model(prompt, {
      max_new_tokens: 90,
      temperature: 0.2,
      do_sample: false
    });

    const generated = (response && response[0] && response[0].generated_text) ? response[0].generated_text.trim() : "";

    if (!generated) {
      outputEl.textContent = fallbackAnswer(question);
    } else {
      outputEl.textContent = preciseAnswer(generated);
    }

    statusEl.textContent = "Model status: Ready (running in your browser)";
  } catch (error) {
    outputEl.textContent = fallbackAnswer(question);
    statusEl.textContent = "Model status: Fallback mode (resume-only retrieval)";
  } finally {
    askButtonEl.disabled = false;
  }
}

function initializeAssistant() {
  if (!statusEl || !outputEl || !inputEl || !askButtonEl) {
    return;
  }

  statusEl.textContent = "Model status: Initializing...";

  ensureModelLoaded()
    .then(() => {
      statusEl.textContent = "Model status: Ready (running in your browser)";
    })
    .catch(() => {
      statusEl.textContent = "Model status: Fallback mode (resume-only retrieval)";
    });
}

askButtonEl.addEventListener("click", answerQuestion);
inputEl.addEventListener("keydown", (event) => {
  if (event.key === "Enter") {
    answerQuestion();
  }
});

initializeAssistant();