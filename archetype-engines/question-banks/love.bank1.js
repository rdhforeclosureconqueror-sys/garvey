"use strict";

const { buildBank } = require("./love.shared");

module.exports = buildBank({
  bankId: "BANK_1",
  omissionByClass: {
    ID: ["RS", "AL", "EC", "AV", "ES"],
    BH: ["RS", "AL", "EC", "AV", "ES", "RS"],
    SC: ["AL", "EC", "AV", "ES", "RS", "AL"],
    ST: ["EC", "AV", "ES", "RS", "AL", "EC"],
    DS: ["AV", "ES"],
  },
});
