const openai = require('../config/openai');
const promptAgent = require('../agents/promptAgent');

const analyzeThought = async (input) => {
  if (process.env.DEV_MODE === 'true') {
    console.log('[DEV_MODE] Returning mock data for input:', input);
    return {
      type: "map",
      tone: "calm",
      data: {
        central: "main thought",
        branches: ["Why do you want to do that?", "What is the first step you should take?"]
      }
    };
  }

  const response = await openai.chat.completions.create({
    model: "gpt-4o-mini",
    messages: promptAgent.createMessages(input),
    response_format: { type: "json_object" },
    temperature: 0.2
  });

  const resultText = response.choices[0].message.content;
  return JSON.parse(resultText);
};

module.exports = {
  analyzeThought
};
