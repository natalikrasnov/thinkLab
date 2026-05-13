# ThinkLab 🧠✨

ThinkLab is an experimental, AI-driven collaborative workspace designed to revolutionize how we brainstorm, analyze, and structure complex ideas.

Combining an interactive 3D spatial interface with advanced multi-agent discussion capabilities, ThinkLab turns scattered thoughts into structured, insightful, and actionable maps. 

## 🚀 Features

- **Dynamic 3D Mind Mapping:** A fully interactive, three-dimensional canvas to visualize your thoughts and their connections.
- **AI Agent Discussions:** Watch AI agents debate, analyze, and expand upon your concepts in real-time, providing synthesized multi-perspective insights.
- **Composition & Comparison Views:** Evaluate multiple options across AI-generated dimensions to make informed, data-driven decisions.
- **Modern Premium UI:** A sleek, glassmorphic design system that feels alive, responsive, and incredibly polished.

## 🛠️ Tech Stack

- **Frontend:** React, TypeScript, Vite, SCSS
- **Backend:** Node.js, Express
- **AI Integration:** OpenAI API
- **Deployment:** GitHub Actions & GitHub Pages (Frontend)

## 💻 Getting Started Locally

### Prerequisites
- Node.js (v18+)
- An OpenAI API Key

### Installation

1. **Clone the repository**
   ```bash
   git clone https://github.com/natalikrasnov/thinkLab.git
   cd thinkLab
   ```

2. **Setup the Backend**
   ```bash
   cd server
   npm install
   ```
   Create a `.env` file in the `server` directory and add your OpenAI key:
   ```env
   OPENAI_API_KEY=your-api-key-here
   PORT=3002
   DEV_MODE=true
   ```
   Start the server:
   ```bash
   npm start
   ```

3. **Setup the Frontend**
   Open a new terminal window and run:
   ```bash
   cd client
   npm install
   ```
   Start the Vite development server:
   ```bash
   npm run dev
   ```

4. **Explore ThinkLab**
   Open your browser and navigate to `http://localhost:5173` to start mapping your mind!

## 🌐 Live Deployment

The frontend of ThinkLab is automatically deployed to GitHub Pages! 
Every push to the `main` branch triggers a GitHub Actions workflow that builds the Vite app and publishes it.

*Note: The live frontend requires a hosted instance of the Node.js backend. You can update the `VITE_API_URL` environment variable to connect the GitHub Pages deployment to your hosted server.*

---
*Designed with ❤️ for deep thinkers.*
