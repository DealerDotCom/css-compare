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

const propsToRound = [
  "line-height",
];
const roundNumbers = (rule) => {
  if (rule.declarations && rule.declarations.length) {
    rule.declarations.forEach(function(declaration){
      if (declaration.value &&
          propsToRound.includes(declaration.property)) {
        declaration.value = declaration.value.replace(/^([\d.]+)/g, match => {
          return +(Math.round(match + "e+5")  + "e-5");
        })
      }
    });
  }

  // Recurse
  if (rule.rules && rule.rules.length) {
    rule.rules.forEach(roundNumbers);
  }
  if (rule.keyframes && rule.keyframes.length) {
    rule.keyframes.forEach(roundNumbers);
  }
};

module.exports = function(root, rw) {
  root.rules.forEach(throwAwayOldFlexboxPrefixes);
  root.rules.forEach(roundNumbers);
};
