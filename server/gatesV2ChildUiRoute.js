'use strict';

const express = require('express');
const path = require('node:path');
const { EmotionK1ExperienceAdapter } = require('../gates-v2/ui/emotionK1ExperienceAdapter');

function createGatesV2ChildRouter({ adapter = new EmotionK1ExperienceAdapter() } = {}) {
  const router = express.Router();
  router.use((req, res, next) => {
    res.set('X-Robots-Tag', 'noindex, nofollow, noarchive');
    res.set('Cache-Control', 'no-store');
    return next();
  });
  router.use('/api', express.json({ limit: '16kb', strict: true }));

  const clientRoot = path.join(__dirname, '..', 'public', 'gates-v2-child');
  router.get('/', (req, res) => res.sendFile(path.join(clientRoot, 'emotion-k1.html')));
  router.get('/emotion-k1.html', (req, res) => res.sendFile(path.join(clientRoot, 'emotion-k1.html')));
  router.get('/emotion-k1.css', (req, res) => res.sendFile(path.join(clientRoot, 'emotion-k1.css')));
  router.get('/emotion-k1.js', (req, res) => res.sendFile(path.join(clientRoot, 'emotion-k1.js')));
  router.post('/api/start', (req, res) => safeSend(res, () => adapter.startExperience()));
  router.get('/api/session/:id', (req, res) => safeSend(res, () => adapter.getCurrentProjection(req.params.id)));
  router.post('/api/session/:id/action', (req, res) => safeSend(res, () => adapter.submitAction(req.params.id, req.body || {})));
  router.post('/api/session/:id/replay', (req, res) => safeSend(res, () => adapter.replay(req.params.id)));
  router.post('/api/session/:id/restart', (req, res) => safeSend(res, () => adapter.restart(req.params.id)));
  router.post('/api/session/:id/exit', (req, res) => safeSend(res, () => adapter.exit(req.params.id)));
  router.use('/api', (req, res) => res.status(404).json(errorPayload('That Gates V2 child path is not available.', 'Endpoint not found.')));
  router.use('/api', (err, req, res, next) => {
    if (err) return res.status(400).json(errorPayload('That request could not be used. Please try again.', 'Invalid JSON request body.'));
    return next();
  });
  return router;
}

function safeSend(res, operation) {
  try {
    return send(res, operation());
  } catch (error) {
    return res.status(500).json(errorPayload('The Emotion Gate could not start. Please try again.', error && error.message ? error.message : 'Unhandled startup error.'));
  }
}

function send(res, result) {
  if (!result || typeof result !== 'object') {
    return res.status(500).json(errorPayload('The Emotion Gate returned an empty response. Please try again.', 'Route handler did not return a result object.'));
  }
  return res.status(result.ok ? 200 : (result.status || 400)).json(result.ok === false ? { message: result.error || 'The Emotion Gate request failed.', ...result } : result);
}

function errorPayload(error, message) { return { ok: false, error, message }; }

module.exports = { createGatesV2ChildRouter, errorPayload };
