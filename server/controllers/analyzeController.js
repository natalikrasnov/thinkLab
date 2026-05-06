const { analyzeThought } = require('../services/analyzeService');

const analyzeHandler = async (req, res) => {
  try {
    const { input } = req.body;
    
    if (!input || typeof input !== 'string') {
      return res.status(400).json({ error: 'Input text is required' });
    }

    const jsonResult = await analyzeThought(input);
    res.json(jsonResult);

  } catch (error) {
    console.error('Error in analyzeHandler:', error);
    res.status(500).json({ error: 'Failed to analyze input' });
  }
};

module.exports = {
  analyzeHandler
};
