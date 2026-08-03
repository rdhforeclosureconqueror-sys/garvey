'use strict';

function isApprovedCompletionNode(experience, nodeId) {
  const node = experience.nodes.find((item) => item.node_id === nodeId);
  return node?.node_type === 'completion'
    && experience.completion_rules.some((rule) => rule.node_id === nodeId);
}

function completeSession(experience, session) {
  if (!isApprovedCompletionNode(experience, session.current_node_id)) return session;
  return {
    ...session,
    status: 'completed',
    completion: Object.freeze({ completed: true, node_id: session.current_node_id, revision: session.revision }),
  };
}

module.exports = { isApprovedCompletionNode, completeSession };
