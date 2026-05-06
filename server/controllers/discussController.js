const { discussThought } = require('../services/discussService');

const discussHandler = async (req, res) => {
  try {
    const { mapData } = req.body;
    
    if (!mapData) {
      return res.status(400).json({ error: 'Map data is required' });
    }

    const discussionResult = await discussThought(mapData);
    res.json(discussionResult);

  } catch (error) {
    console.error('Error in discussHandler:', error);
    res.status(500).json({ error: 'Failed to generate discussion' });
  }
};

module.exports = {
  discussHandler
};
