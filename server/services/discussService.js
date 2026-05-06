const openai = require('../config/openai');
const discussionAgent = require('../agents/discussionAgent');

const discussThought = async (mapData) => {
  if (process.env.DEV_MODE === 'true') {
    console.log('[DEV_MODE] Returning mock discussion data');
    return {
      discussion: [
        {
          agent: "The Strategist",
          role: "Focuses on long-term goals and planning",
          message: "Looking at their map, it's clear they are balancing immediate technical needs with long-term maintainability."
        },
        {
          agent: "The Pragmatist",
          role: "Focuses on execution and practical constraints",
          message: "Exactly. But we need to advise them on the simplest path forward right now so they don't get stuck in analysis paralysis."
        },
        {
          agent: "The Strategist",
          role: "Focuses on long-term goals and planning",
          message: "Agreed. Based on your full exploration, here is what you should do: start with the minimal viable structure you've identified, and scale it only when the codebase grows beyond a single module. You're completely on the right track."
        }
      ]
    };
  }

  const promptInput = JSON.stringify(mapData, null, 2);

  const response = await openai.chat.completions.create({
    model: "gpt-4o",
    messages: discussionAgent.createMessages(promptInput),
    response_format: { type: "json_object" },
    temperature: 0.7
  });

  const resultText = response.choices[0].message.content;
  return JSON.parse(resultText);
};

module.exports = {
  discussThought
};
