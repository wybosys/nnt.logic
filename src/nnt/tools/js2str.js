let argv = process.argv;
if (argv.length != 4) {
    console.log("node js2str.js input.js output.js");
    process.exit(1);
}

let inp = argv[2];
let oup = argv[3];

const mini = require("minify")
const fs = require("fs")

mini(inp, (err, data) => {
    data = data.replace(/\\/g, "\\\\");
    data = data.replace(/\n/g, "");
    data = data.replace(/"/g, "\\\"");
    fs.writeFileSync(oup, '"' + data + '"');
});
