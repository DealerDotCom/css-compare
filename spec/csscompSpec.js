var csscomp = require('../css-compare.js');
var fs = require('fs');

var files = {
  'control': 'control.css',
  'test': 'test.css',
  'normalizedControl': 'control-normalized.css',
  'normalizedTest': 'test-normalized.css',
  'expected': 'expected.diff'
}

function fixture(filename) {
  return fs.realpathSync('./spec/fixtures/'+filename);
}

describe("Comparisons", function() {
  it("should compare", function() {
    var diff = csscomp(fixture(files.test), fixture(files.control), {label: files.test}).diff;
    var expected = fs.readFileSync(fixture(files.expected)).toString();
    expect(diff).toBe(expected);
  });
});

describe("Outputs", function() {
  it("should output", function() {
    var output = csscomp(fixture(files.test), fixture(files.control), {label: files.test});
    // Uncomment to rewrite test files.
    // fs.writeFileSync(fixture(files.normalizedControl), output.control);
    // fs.writeFileSync(fixture(files.normalizedTest), output.test);
    var expectedControl = fs.readFileSync(fixture(files.normalizedControl)).toString();
    var expectedTest = fs.readFileSync(fixture(files.normalizedTest)).toString();
    expect(output.control).toBe(expectedControl);
    expect(output.test).toBe(expectedTest);
  });
});

describe("Extensions", function(){
  it("should remove compass stuff", function(){

    var diff = csscomp(fixture('extensions/compass/'+files.test), fixture('extensions/compass/'+files.control), {label: files.test, extensions:'compass'}).diff;
    var expected = fs.readFileSync(fixture('extensions/compass/'+files.expected)).toString();
    expect(diff).toBe(expected);

  });
});
