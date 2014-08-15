var csscomp = require('../css-compare.js');
var fs = require('fs');

function fixture(filename) {
  return fs.realpathSync('./spec/fixtures/'+filename);
}

describe("Comparisons", function() {
  it("should compare", function() {
    var diff = csscomp(fixture('test.css'), fixture('control.css'), 'test.css');
    var expected = fs.readFileSync(fixture('expected.diff')).toString();
    expect(diff).toBe(expected);
  });
});