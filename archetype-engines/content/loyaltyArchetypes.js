"use strict";
const base = require('./loveArchetypes');
module.exports = base.map((a) => ({ ...a, slug: `loyal-${a.slug}`, code: `LOYAL_${a.code}`, name: `${a.name.replace('The ', '')} Loyalty`, imageKey: `loyalty-${a.slug}` }));
