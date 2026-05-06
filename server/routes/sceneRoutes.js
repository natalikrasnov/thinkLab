const express = require('express');
const router = express.Router();
const sceneAgent = require('../agents/sceneAgent');

// /api/scene/chat
router.post('/chat', async (req, res) => {
  try {
    const { context, history } = req.body;
    const result = await sceneAgent.askQuestion(context, history || []);
    res.json(result);
  } catch (error) {
    console.error('Error in scene chat:', error);
    res.status(500).json({ error: 'Failed to chat with scene agent' });
  }
});

// /api/scene/generate-background
router.post('/generate-background', async (req, res) => {
  try {
    const { imagePrompt, context } = req.body;
    
    // Generate the image and the tools in parallel for speed!
    const [imageUrl, tools] = await Promise.all([
      sceneAgent.generateBackground(imagePrompt),
      sceneAgent.generateToolbox(context, imagePrompt)
    ]);
    
    res.json({ imageUrl, tools });
  } catch (error) {
    console.error('Error generating background or tools:', error);
    res.status(500).json({ error: 'Failed to generate assets' });
  }
});

// /api/scene/generate-tools
router.post('/generate-tools', async (req, res) => {
  try {
    const { context } = req.body;
    const tools = await sceneAgent.generateToolbox(context, "");
    res.json({ tools });
  } catch (error) {
    console.error('Error generating tools:', error);
    res.status(500).json({ error: 'Failed to generate tools' });
  }
});

module.exports = router;
