// netlify/functions/api.js
const express = require('express');
const serverless = require('netlify-lambda');

// Import individual function handlers
const gameMoveHandler = require('./game-move');
const analyzeHandler = require('./analyze');
const learnHandler = require('./learn');
const puzzleHandler = require('./puzzle');
const chatHandler = require('./chat');

const app = express();

// Enable CORS for all routes
app.use((req, res, next) => {
    res.header('Access-Control-Allow-Origin', '*');
    res.header('Access-Control-Allow-Headers', 'Content-Type');
    res.header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    if (req.method === 'OPTIONS') {
        res.sendStatus(200);
    } else {
        next();
    }
});

app.use(express.json());

// Route to specific handlers
app.post('/game/move', gameMoveHandler);
app.post('/analyze', analyzeHandler);
app.post('/learn', learnHandler);
app.post('/puzzle', puzzleHandler);
app.post('/chat', chatHandler);

// Health check endpoint
app.get('/health', (req, res) => {
    res.json({ status: 'OK', timestamp: new Date().toISOString() });
});

const handler = serverless(app);
exports.handler = async (event, context) => {
    return handler(event, context);
};