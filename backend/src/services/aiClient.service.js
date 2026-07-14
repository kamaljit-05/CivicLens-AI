const axios = require('axios');

const AI_SERVICE_URL = process.env.AI_SERVICE_URL || 'http://localhost:8000';

/**
 * Sends the issue photo + user-supplied text to the AI microservice for a
 * multimodal summary and suggested fix. Called right after issue creation;
 * failures are non-fatal — the report is still saved, just without AI enrichment.
 */
async function summarizeIssue({ imageUrl, title, description }) {
  try {
    const { data } = await axios.post(
      `${AI_SERVICE_URL}/summarize`,
      { image_url: imageUrl, title, description },
      { timeout: 15000 }
    );
    return { summary: data.summary, suggestion: data.suggestion };
  } catch (err) {
    console.error('AI summarize call failed:', err.message);
    return { summary: null, suggestion: null };
  }
}

/**
 * Checks an uploaded image for AI-generation / provenance signals
 * (e.g. C2PA metadata, SynthID watermark) before the report is published.
 */
async function checkImageAuthenticity({ imageUrl }) {
  try {
    const { data } = await axios.post(
      `${AI_SERVICE_URL}/check-authenticity`,
      { image_url: imageUrl },
      { timeout: 10000 }
    );
    return { isAiGenerated: data.is_ai_generated, confidence: data.confidence, signals: data.signals };
  } catch (err) {
    console.error('AI authenticity call failed:', err.message);
    // Fail open but flag for manual review rather than silently trusting the image.
    return { isAiGenerated: null, confidence: null, signals: ['check_unavailable'] };
  }
}

module.exports = { summarizeIssue, checkImageAuthenticity };
