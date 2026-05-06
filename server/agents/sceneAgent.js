const OpenAI = require('openai');

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

async function askQuestion(context, history) {
  const messages = [
    {
      role: 'system',
      content: `You are an expert AI design assistant helping a user create a visual composition (like a garden redesign, room layout, etc.). The main topic is: "${context}". Your goal is to ask interactive questions one-by-one to gather exactly what they want in the image. Keep it brief and conversational. 
Once you have enough information to generate a DALL-E image prompt, reply ONLY with a JSON object: {"done": true, "imagePrompt": "the full detailed dall-e prompt for a top-down view"}. 
Otherwise, reply with a JSON object: {"done": false, "question": "your next question"}.
Make sure the imagePrompt explicitly asks for a top-down, clean 2D representation suitable for a drag-and-drop background canvas.`
    },
    ...history
  ];

  const response = await openai.chat.completions.create({
    model: "gpt-4o",
    messages: messages,
    response_format: { type: "json_object" }
  });

  return JSON.parse(response.choices[0].message.content);
}

async function generateBackground(imagePrompt) {
  const response = await openai.images.generate({
    model: "dall-e-3",
    prompt: imagePrompt,
    n: 1,
    size: "1024x1024",
  });
  return response.data[0].url;
}

async function generateToolbox(context, imagePrompt) {
  const prompt = `Based on the context "${context}" and scene prompt "${imagePrompt || ''}", provide a list of exactly 4 draggable objects or elements the user might want to place on this scene. 
Return ONLY a JSON object with a single key "tools" containing an array of strings. Each string must be a short name. 
Example format: { "tools": ["Tall Tree", "Wood Bench", "Flower Bed", "Stone Path"] }`;
  
  const response = await openai.chat.completions.create({
    model: "gpt-4o",
    messages: [{ role: "user", content: prompt }],
    response_format: { type: "json_object" }
  });

  const parsed = JSON.parse(response.choices[0].message.content);
  const toolNames = parsed.tools;

  const toolPromises = toolNames.map(async (name) => {
    try {
      const imgRes = await openai.images.generate({
        model: "dall-e-3",
        prompt: `A top-down 2D asset icon of "${name}" for a garden planning app. High quality, flat 2d vector art style, clean pure white background. isolated element.`,
        n: 1,
        size: "1024x1024",
      });
      return { type: name, url: imgRes.data[0].url };
    } catch (e) {
      console.error('Failed to generate tool image for', name, e);
      return { type: name, url: null };
    }
  });

  const toolsWithImages = await Promise.all(toolPromises);
  return toolsWithImages.filter(t => t.url);
}

module.exports = {
  askQuestion,
  generateBackground,
  generateToolbox
};
