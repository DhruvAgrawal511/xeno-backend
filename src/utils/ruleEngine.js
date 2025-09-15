
export function matchesRule(customer, rule) {
  if (!rule) return true;

  if (rule.op) {
    const results = rule.children.map(r => matchesRule(customer, r));
    if (rule.op === 'AND') return results.every(Boolean);
    if (rule.op === 'OR') return results.some(Boolean);
    return false;
  }

  const val = customer[rule.field];
  const cmp = rule.cmp;
  const ruleVal = rule.value;

  switch (cmp) {
    case 'gt': return val > ruleVal;
    case 'lt': return val < ruleVal;
    case 'eq': return val == ruleVal;
    case 'ne': return val != ruleVal;
    case 'gte': return val >= ruleVal;
    case 'lte': return val <= ruleVal;
    default: return false;
  }
}
