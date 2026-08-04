'use strict';

const crypto = require('node:crypto');
const express = require('express');
const path = require('node:path');
const { EmotionK1PilotAdapter } = require('../gates-v2/ui/emotionK1PilotAdapter');

const FLAG = 'gates_emotion_k1_ui_pilot_v1';
const COOKIE = 'gates_emotion_k1_pilot';

function enabled(env = process.env) { return String(env.GATES_EMOTION_K1_UI_PILOT_V1 || '').toLowerCase() === 'true'; }
function equalSecret(left, right) {
  const a = Buffer.from(String(left || '')); const b = Buffer.from(String(right || ''));
  return a.length > 0 && a.length === b.length && crypto.timingSafeEqual(a, b);
}
function cookieValue(req) {
  return String(req.headers.cookie || '').split(';').map((v) => v.trim()).find((v) => v.startsWith(`${COOKIE}=`))?.slice(COOKIE.length + 1) || '';
}
function isOwner(req, env = process.env) {
  if (req.authActor && (req.authActor.role === 'business_owner' || req.authActor.isAdmin)) return true;
  return equalSecret(cookieValue(req), env.GATES_EMOTION_K1_UI_PILOT_OWNER_TOKEN);
}

function createGatesV2PilotUiRouter({ env = process.env, adapter = new EmotionK1PilotAdapter() } = {}) {
  const router = express.Router();
  router.use((req, res, next) => {
    res.set('X-Robots-Tag', 'noindex, nofollow, noarchive');
    res.set('Cache-Control', 'no-store');
    if (!enabled(env)) return res.status(404).send('Not found');
    const token = String(req.query.pilot_token || '');
    if (equalSecret(token, env.GATES_EMOTION_K1_UI_PILOT_OWNER_TOKEN)) {
      res.cookie(COOKIE, token, { httpOnly: true, sameSite: 'strict', secure: req.secure, maxAge: 4 * 60 * 60 * 1000, path: '/gates-v2-child' });
      return res.redirect(303, req.path);
    }
    if (!isOwner(req, env)) return res.status(404).send('Not found');
    return next();
  });

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
  return router;
}

function send(res, result) { return res.status(result.ok ? 200 : (result.status || 400)).json(result); }

module.exports = { FLAG, enabled, isOwner, createGatesV2PilotUiRouter };
