"use strict";

const { registerReadablePlayableContentBlocks } = require("./contentRegistryService");

function registerVoiceReadableContentBlock(input = {}, options = {}) {
  return registerReadablePlayableContentBlocks([input], {
    ...options,
    scope: options.scope || input.scope || "tde_content",
  }).blocks[0];
}

function registerVoiceReadableContentBlocks(blocks = [], options = {}) {
  return registerReadablePlayableContentBlocks(blocks, {
    ...options,
    scope: options.scope || "tde_content",
  });
}

module.exports = {
  registerVoiceReadableContentBlock,
  registerVoiceReadableContentBlocks,
};
