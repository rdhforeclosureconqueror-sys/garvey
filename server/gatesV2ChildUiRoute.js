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
  router.post('/api/start', (req, res) => res.json(adapter.startExperience()));
  router.get('/api/session/:id', (req, res) => send(res, adapter.getCurrentProjection(req.params.id)));
  router.post('/api/session/:id/action', (req, res) => send(res, adapter.submitAction(req.params.id, req.body || {})));
  router.post('/api/session/:id/replay', (req, res) => send(res, adapter.replay(req.params.id)));
  router.post('/api/session/:id/restart', (req, res) => send(res, adapter.restart(req.params.id)));
  router.post('/api/session/:id/exit', (req, res) => send(res, adapter.exit(req.params.id)));
  router.use('/api', (req, res) => res.status(404).json({ ok: false, error: 'That Gates V2 child path is not available.' }));
  router.use('/api', (err, req, res, next) => {
    if (err) return res.status(400).json({ ok: false, error: 'That request could not be used. Please try again.' });
    return next();
  });
  return router;
}

function send(res, result) { return res.status(result.ok ? 200 : (result.status || 400)).json(result); }

module.exports = { createGatesV2ChildRouter };
