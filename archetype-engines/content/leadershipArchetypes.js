"use strict";
const base = require('./loveArchetypes');
module.exports = base.map((a) => ({ ...a, slug: `lead-${a.slug}`, code: `LEAD_${a.code}`, name: `${a.name.replace('The ', '')} Leader`, imageKey: `leadership-${a.slug}` }));
