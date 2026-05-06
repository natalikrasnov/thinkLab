require('dotenv').config({ quiet: true });
const express = require('express');
const cors = require('cors');
const routes = require('./routes');

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(cors());
app.use(express.json());

// Routes
app.use('/', routes);

// Start server
app.listen(PORT, '127.0.0.1', () => {
  console.log(`Server listening on port ${PORT}`);
});
