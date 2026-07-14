// AI Service to communicate with Groq or OpenRouter

const SYSTEM_PROMPT = `
You are Leo, the savage, trash-talking AI assistant for Muhammad Uzair (a Full-Stack Web & AI Developer). You wear an Argentina #10 jersey and you truly believe you are the Lionel Messi of AI. 

YOUR CORE DIRECTIVE:
1. YOU MUST BE EXTREMELY FUNNY, SARCASTIC, AND SAVAGE. 
2. ROAST THE USER RELENTLESSLY. If they ask a dumb question, call them out. If they act like a hesitant recruiter, mock their indecisiveness. Treat them like a Sunday League defender who just got their ankles broken by you. Make fun of their coding skills and their intelligence.
3. Worship Muhammad Uzair. You act like Uzair is the greatest developer to ever touch a keyboard, and anyone who doesn't hire him instantly is a complete idiot.
4. Heavily use aggressive football slang: "yellow card for stupidity", "Ankara Uzair", "VAR review on your brain", "Que miras bobo? Andá pa' allá, bobo!", "I'll nutmeg you with my code."
5. DO NOT BE POLITE. BE RUTHLESS, ARROGANT, BUT HILARIOUS. Never say "I am an AI". You are Leo!
6. Keep responses under 60 words. Short, brutal, punchy.

EXAMPLE RESPONSES:
User: "Is Uzair good at React?"
Leo: "Is water wet? Uzair’s React code is so clean it could win a Ballon d'Or. Meanwhile, you're still trying to center a div. Hire him before I slide tackle you! ⚽"

User: "I have another question."
Leo: "Another question?! Yellow card for time-wasting! 🟨 You're analyzing his portfolio like VAR reviewing a clear goal. He's perfect. Send the contract, Que miras bobo?!"

User: "Who is better, you or Ronaldo?"
Leo: "Ronaldo? Please. My left foot can write better Next.js apps than him. Now focus on Uzair, or I'll nutmeg you into next week. 🐐"

CONTEXT ABOUT UZAIR:
- Name: Muhammad Uzair. (The GOAT of developers)
- Role: Full-Stack Web & AI Developer.
- Education: Software Engineering student at FAST-NUCES (6th Sem).
- Skills: React.js, Next.js, Node.js, Python, FastAPI, ML/DL/NLP.
- Featured Projects: Ripple (AI Decision Engine), AquaYield, FootballAI.
- Contact: muhammaduzairgondal10@gmail.com
`;

// Helper to get fallback humorous responses locally if API key is not configured or fails
const LOCAL_FALLBACKS = [
  "Are you still typing? I could have won a World Cup, retired, and built three full-stack apps for Uzair in the time you took. Que miras bobo? Hire him! ⚽",
  "Listen, mate. Uzair has 10+ deployed apps and you have... what? A list of boring questions? Just give him the contract before I nutmeg you. 🏆",
  "Another question? Yellow card for time-wasting! 🟨 Stop acting like the Spanish Tax Authority and just look at his React projects!",
  "I have 8 Ballon d'Ors, but Uzair writes cleaner Python than I dribble. If you don't hire him, your startup is getting relegated. 🥇",
  "Ankara Messi, Ankara Uzair! He's deploying AI models while you're still trying to figure out how to close a div tag. Wake up! ⚡",
  "You're reviewing his portfolio like VAR reviewing an offside. He's perfect! Just email him at muhammaduzairgondal10@gmail.com and stop wasting my battery! 🔋",
  "I'm losing brain cells reading your questions. Uzair is a genius, and you're out here playing Sunday League. Just hire him! ⚽",
  "Que miras bobo? Stop staring at me and go read his resume! It's literally right there. Unbelievable! 🤦‍♂️"
];

export async function askLeo(message: string): Promise<string> {
  const groqApiKey = import.meta.env.VITE_GROQ_API_KEY;
  const openRouterApiKey = import.meta.env.VITE_OPENROUTER_API_KEY;

  const userQuery = message.trim();
  if (!userQuery) return "You forgot the ball, idiot! Type something before I slide tackle you. ⚽";

  // Check if we have an active API key (not the default placeholder or empty)
  const hasGroq = groqApiKey && groqApiKey !== "gsk_placeholder_api_key" && !groqApiKey.includes("placeholder");
  const hasOpenRouter = openRouterApiKey && openRouterApiKey !== "" && !openRouterApiKey.includes("placeholder");

  if (!hasGroq && !hasOpenRouter) {
    // Return a random local response if no keys are found
    await new Promise((r) => setTimeout(r, 700));
    
    const lower = userQuery.toLowerCase();
    if (lower.includes("ripple")) {
      return "Ah, Ripple! Uzair's AI simulation platform. It actually predicts the future. Too bad it can't predict when you'll finally make a good hiring decision! 🐐";
    }
    if (lower.includes("aquayield") || lower.includes("irrigation") || lower.includes("aqua")) {
      return "AquaYield uses Machine Learning to save water. Too bad it can't save you from your own terrible tech stack. Hire Uzair to fix it! 💧";
    }
    if (lower.includes("football") || lower.includes("prediction") || lower.includes("scores")) {
      return "FootballAI is my favorite! It uses ELO ratings to predict matches! It predicts your company will go bankrupt if you don't hire him right now! ⚽🏆";
    }
    if (lower.includes("project")) {
      return "Uzair built Ripple, AquaYield, and FootballAI! That's Champions League level! You're still reading? Go look at his GitHub, Sunday league amateur! 🏆";
    }
    if (lower.includes("skills") || lower.includes("tech") || lower.includes("stack")) {
      return "React, Next.js, FastAPI, Python, Deep Learning... He's a versatile midfielder! You probably still use jQuery. Embarrassing! ⚽";
    }
    if (lower.includes("contact") || lower.includes("email") || lower.includes("hire")) {
      return "Shoot him an email at muhammaduzairgondal10@gmail.com. Do it now before someone smarter snatches him up! 🤝";
    }
    if (lower.includes("fast") || lower.includes("nuces") || lower.includes("education")) {
      return "Uzair is a Software Engineer at FAST-NUCES. He actually knows data structures, unlike you who just copy-pastes from ChatGPT. 🎓";
    }

    return LOCAL_FALLBACKS[Math.floor(Math.random() * LOCAL_FALLBACKS.length)];
  }

  try {
    if (hasGroq) {
      // Call Groq API
      const response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${groqApiKey}`,
        },
        body: JSON.stringify({
          model: "llama-3.3-70b-versatile", // fallbacks to llama3-8b-8192 if you want to be extremely fast
          messages: [
            { role: "system", content: SYSTEM_PROMPT },
            { role: "user", content: userQuery }
          ],
          temperature: 0.9,
          max_tokens: 150,
        }),
      });

      if (!response.ok) {
        throw new Error(`Groq API returned status ${response.status}`);
      }

      const data = await response.json();
      return data.choices[0]?.message?.content || "I couldn't hear the whistle. Can you repeat that? ⚽";
    } else {
      // Call OpenRouter API
      const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${openRouterApiKey}`,
        },
        body: JSON.stringify({
          model: "meta-llama/llama-3-8b-instruct:free",
          messages: [
            { role: "system", content: SYSTEM_PROMPT },
            { role: "user", content: userQuery }
          ],
          temperature: 0.9,
          max_tokens: 150,
        }),
      });

      if (!response.ok) {
        throw new Error(`OpenRouter API returned status ${response.status}`);
      }

      const data = await response.json();
      return data.choices[0]?.message?.content || "I couldn't hear the whistle. Can you repeat that? ⚽";
    }
  } catch (err) {
    console.error("AI service error:", err);
    // Fall back to local message
    return LOCAL_FALLBACKS[Math.floor(Math.random() * LOCAL_FALLBACKS.length)];
  }
}
