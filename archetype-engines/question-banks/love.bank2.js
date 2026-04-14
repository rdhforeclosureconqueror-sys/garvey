"use strict";

const { buildBank } = require("./love.shared");

module.exports = buildBank({
  bankId: "BANK_2",
  omissionByClass: {
    ID: ["AL", "EC", "AV", "ES", "RS"],
    BH: ["AL", "EC", "AV", "ES", "RS", "AL"],
    SC: ["EC", "AV", "ES", "RS", "AL", "EC"],
    ST: ["AV", "ES", "RS", "AL", "EC", "AV"],
    DS: ["ES", "RS"],
  },
});
