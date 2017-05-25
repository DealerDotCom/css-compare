const removeClearfix = (rule) => {
  if (rule.declarations && rule.declarations.length) {
    rule.declarations = rule.declarations.filter((declaration) => {
      const prop = declaration.property;
      const val = declaration.value;

      if (prop === 'display' && val === 'table') {
        return false;
      }

      if (prop === 'content' && val === '" "') {
        return false;
      }

      if (prop === 'clear' && val === 'both') {
        return false;
      }

      if (prop === 'overflow' && val === 'hidden') {
        return false;
      }

      return true;
    });
  }

  // Recurse
  if (rule.rules && rule.rules.length) {
    rule.rules.forEach(removeClearfix);
  }
  if (rule.keyframes && rule.keyframes.length) {
    rule.keyframes.forEach(removeClearfix);
  }
};

module.exports = function(root, rw) {
  root.rules.forEach(removeClearfix);
};
