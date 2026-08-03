'use strict';
const { load, clone } = require('./helpers');
const experience = () => clone(load('emotion-block-tower.example.json'));
const startInput = () => ({ session_id: 'session-1' });
module.exports = { experience, startInput };
