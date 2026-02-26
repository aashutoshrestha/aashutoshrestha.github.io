const statusEl = document.getElementById("qaStatus");
const outputEl = document.getElementById("qaOutput");
const inputEl = document.getElementById("qaInput");
const askButtonEl = document.getElementById("qaAskButton");

const refusalText =
  "I can only answer questions about Aashutosh Shrestha based on this website and resume.";

const personalKeywords = [
  "aashutosh",
  "you",
  "your",
  "he",
  "his",
  "him",
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
  "father",
  "mother",
  "sister",
  "grandfather",
  "grandmother",
  "family",
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
  "work",
  "career",
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

function stylizeAnswer(answer) {
  const text = (answer || "").trim();
  if (!text || text === refusalText) {
    return text;
  }

  const hasPraiseTone = /highly|strong|capable|excellent|effective|impressive|skilled/i.test(text);
  let result = text;

  if (!hasPraiseTone) {
    result = `${result} He is known for being highly capable, dependable, and impactful in his work.`;
  }

  if (result.length < 150) {
    result = `${result} Overall, he brings a strong blend of technical depth, communication, and practical problem-solving.`;
  }

  return result;
}

function getDirectAnswer(question) {
  const q = normalize(question);
  const profile = window.AASHUTOSH_PROFILE || {};

  if (includesAny(q, ["how are you", "how is he", "how is aashutosh", "what kind of", "tell me about him", "personality", "strengths"])) {
    const strengths = Array.isArray(profile.strengths) ? profile.strengths : [];
    const strengthsText = strengths.length
      ? strengths.join("; ")
      : "high adaptability, strong productivity under pressure, strong communication, and strong research";
    return `Aashutosh is a highly capable engineer with ${strengthsText}. He communicates clearly across teams and applies strong research skills to deliver practical, data-informed outcomes.`;
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

  if (includesAny(q, ["father", "mother", "sister", "grandfather", "grandmother", "family", "parents"])) {
    const family = profile.family || {};
    return `Family details: father ${family.father || "N/A"}, mother ${family.mother || "N/A"}, sister ${family.sister || "N/A"}, grandfather ${family.grandfather || "N/A"}, grandmother ${family.grandmother || "N/A"}.`;
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
    const { pipeline, env } = await import("https://cdn.jsdelivr.net/npm/@xenova/transformers@2.17.2");
    env.allowLocalModels = false;
    env.useBrowserCache = true;

    generator = await pipeline("text2text-generation", "Xenova/flan-t5-small");
    statusEl.textContent = "Model status: Ready (running in your browser)";
    return generator;
  })();

  return loadingModel;
}

function fallbackAnswer(question) {
  const context = retrieveContext(question, 4);
  return stylizeAnswer(`Based on Aashutosh's profile:\n- ${context.join("\n- ")}`);
}

async function answerQuestion() {
  const question = inputEl.value.trim();
  if (!question) {
    outputEl.textContent = "Please ask a question about Aashutosh Shrestha.";
    return;
  }

  if (!isAboutAashutosh(question)) {
    outputEl.textContent = refusalText;
    return;
  }

  const directAnswer = getDirectAnswer(question);
  if (directAnswer) {
    outputEl.textContent = stylizeAnswer(directAnswer);
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
      "Answer in plain text with 2-4 sentences.",
      "Use a warm, professional, positive tone that praises him moderately (not exaggerated).",
      "Context:",
      ...contextItems.map((item) => `- ${item}`),
      `Question: ${question}`,
      "Answer:"
    ].join("\n");

    const response = await model(prompt, {
      max_new_tokens: 180,
      temperature: 0.2,
      do_sample: false
    });

    const generated = (response && response[0] && response[0].generated_text) ? response[0].generated_text.trim() : "";

    if (!generated) {
      outputEl.textContent = fallbackAnswer(question);
    } else {
      outputEl.textContent = stylizeAnswer(generated);
    }

    statusEl.textContent = "Model status: Ready (running in your browser)";
  } catch (error) {
    outputEl.textContent = fallbackAnswer(question);
    statusEl.textContent = "Model status: Fallback mode (resume-only retrieval)";
  } finally {
    askButtonEl.disabled = false;
  }
}

askButtonEl.addEventListener("click", answerQuestion);
inputEl.addEventListener("keydown", (event) => {
  if (event.key === "Enter") {
    answerQuestion();
  }
});