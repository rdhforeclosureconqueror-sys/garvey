'use strict';

const ICONS = Object.freeze({ opening: '🏰', notice_feeling: '💭', notice_body: '🫶', pause: '🌬️', first_action: '🛤️', ask_result: '💬', space_result: '🌿', healthy_followup: '🤝', push_result: '🧱', repair_choice: '🪡', repair_result: '💛', reflection: '✨', complete: '🌈' });

function childProjectionViewModel(projection) {
  if (!projection?.current_node) throw new TypeError('A child-safe projection is required');
  const node = projection.current_node;
  return {
    id: node.node_id,
    type: node.node_type,
    title: titleFor(node),
    lines: [...node.visible_text],
    options: node.options.map((option) => ({ ...option, icon: optionIcon(option.option_id) })),
    icon: ICONS[node.node_id] || '✨',
    label: node.accessibility_label,
    narrationAvailable: node.narration_available,
    canContinue: node.node_type === 'content',
    isCompletion: node.node_type === 'completion',
    progress: progressFor(node.node_id)
  };
}

function titleFor(node) {
  if (node.node_id === 'opening') return 'The Tower Tumbles';
  if (node.node_id.endsWith('_result')) return node.node_id === 'repair_result' ? 'Repair Begins' : 'Let’s See What Happened';
  return { notice: 'Notice', practice: 'Pause Together', choice: node.node_id === 'repair_choice' ? 'A Chance to Repair' : 'Choose a Path', reflection: 'Think Together', completion: 'Adventure Complete' }[node.node_type] || 'Emotion Gate';
}

function progressFor(id) {
  if (id === 'opening') return 'Beginning';
  if (id.startsWith('notice') || id === 'pause') return 'Noticing';
  if (id === 'reflection') return 'Reflecting';
  if (id === 'complete') return 'Complete';
  return 'Choosing';
}

function optionIcon(id) {
  if (/adult/.test(id)) return '🧑‍🤝‍🧑';
  if (/space/.test(id)) return '🌿';
  if (/push/.test(id)) return '🧱';
  if (/breath|pause/.test(id)) return '🌬️';
  if (/body|hand|face|heart/.test(id)) return '🫶';
  return '✦';
}

module.exports = { childProjectionViewModel };
