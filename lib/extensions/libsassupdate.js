const throwAwayOldFlexboxPrefixes = (rule) => {
  if (rule.declarations && rule.declarations.length) {
    rule.declarations = rule.declarations.filter((declaration) => {
      const prop = declaration.property;
      const val = declaration.value;

      // Throwing away properties:
      // -moz-flex-direction: *
      // -moz-justify-content: *
      // -ms-flex-align: *
      // -ms-flex-direction: *
      // -ms-flex-pack: *
      // display: -ms-flexbox;

      const throwAwayProps = [
        '-moz-flex-direction',
        '-moz-justify-content',
        '-ms-flex-align',
        '-ms-flex-direction',
        '-ms-flex-pack',
      ];

      if (throwAwayProps.includes(prop)) {
        return false;
      }

      if (prop === 'display' && val === '-ms-flexbox') {
        return false;
      }

      return true;
    });
  }

  // Recurse
  if (rule.rules && rule.rules.length) {
    rule.rules.forEach(throwAwayOldFlexboxPrefixes);
  }
  if (rule.keyframes && rule.keyframes.length) {
    rule.keyframes.forEach(throwAwayOldFlexboxPrefixes);
  }
};

module.exports = function(root, rw) {
  root.rules.forEach(throwAwayOldFlexboxPrefixes);
};
