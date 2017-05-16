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

const declarationUpdates = (rule) => {
  if (rule.declarations && rule.declarations.length) {
    rule.declarations.forEach(function(declaration){
      if (declaration.value) {
        // Change unicode space to space
        declaration.value = declaration.value.replace("\\00a0", " ");

        // Round numbers to 3 digits
        declaration.value = declaration.value.replace(/([\d.]+)/g, match => {
          return +(Math.round(match + "e+3")  + "e-3");
        })
      }
    });
  }

  // Recurse
  if (rule.rules && rule.rules.length) {
    rule.rules.forEach(declarationUpdates);
  }
  if (rule.keyframes && rule.keyframes.length) {
    rule.keyframes.forEach(declarationUpdates);
  }
};

module.exports = function(root, rw) {
  root.rules = root.rules.filter(rule => rule.type !== 'charset');
  root.rules.forEach(throwAwayOldFlexboxPrefixes);
  root.rules.forEach(declarationUpdates);
};
