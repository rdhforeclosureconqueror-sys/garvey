"use strict";

const { buildBank } = require("./love.shared");

module.exports = buildBank({
  bankId: "BANK_3",
  omissionByClass: {
    ID: ["EC", "AV", "ES", "RS", "AL"],
    BH: ["EC", "AV", "ES", "RS", "AL", "EC"],
    SC: ["AV", "ES", "RS", "AL", "EC", "AV"],
    ST: ["ES", "RS", "AL", "EC", "AV", "ES"],
    DS: ["RS", "AL"],
  },
});
