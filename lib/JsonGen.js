/// <reference path="node.d.ts" />
"use strict";
var exec = require('child_process').exec;
var path = require('path');
var fs = require('fs');
require('./Extensions');
var ast = require('./SwiftAst');
var printer = require('./SwiftPrinter');
function fullFilenames(input) {
    if (fs.statSync(input).isDirectory()) {
        return fs.readdirSync(input).flatMap(function (fn) { return fullFilenames(path.join(input, fn)); });
    }
    else if (fs.statSync(input).isFile()) {
        return [input];
    }
    throw new Error("input is neither a file nor a directory");
}
function fileDescription(filename, allFilenames) {
    var dirname = path.dirname(filename);
    var basename = path.basename(filename);
    var outbase = basename.replace('.swift', '+JsonGen.swift');
    var outfile = path.join(dirname, outbase);
    var outExists = allFilenames.indexOf(outfile) > -1;
    return {
        filename: basename,
        fullname: path.join(dirname, basename),
        outbase: outbase,
        outfile: outfile,
        outExists: outExists
    };
}
function generate() {
    var argv = process.argv;
    if (argv.length < 3) {
        console.log('USAGE: swift-json-gen some/directory/FileWithStructs.swift');
        console.log('');
    }
    if (argv[2] == '--version') {
        var pjson = require('../package.json');
        console.log(pjson.version);
    }
    else {
        var inputs = argv.slice(2);
        var filenames = inputs.flatMap(fullFilenames);
        var files = filenames
            .map(function (fn) { return fileDescription(fn, filenames); })
            .filter(function (f) {
            var isJsonGen = f.filename.indexOf('+JsonGen.swift') > 0;
            var isSwift = f.filename.indexOf('.swift') > 0;
            return isSwift && !isJsonGen;
        });
        var filenamesString = files.map(function (f) { return '"' + f.fullname + '"'; }).join(' ');
        var cmd = 'xcrun swiftc -sdk "$(xcrun --show-sdk-path --sdk macosx)" -dump-ast ' + filenamesString;
        var opts = {
            maxBuffer: 200 * 1024 * 1024
        };
        exec(cmd, opts, function (error, stdout, stderr) {
            var parseResult = parseXcOutput(stderr);
            var xcoutputs = parseResult.outputs;
            var errors = parseResult.errors;
            // If an actual error (not a `(source_file`), print and stop
            if (errors.length) {
                errors.forEach(function (error) {
                    console.error(error);
                });
                return;
            }
            if (xcoutputs.length != files.length) {
                console.error('INTERNAL ERROR - swift-json-gen');
                console.error('inconsistency; xcoutputs not equal in length to files');
                console.error('xcoutputs.length: ' + xcoutputs.length + ', files: ' + files.length);
                console.error();
                console.error('Please report this at: https://github.com/tomlokhorst/swift-json-gen/issues');
                return;
            }
            var fileAsts = xcoutputs.map(ast.parse);
            var mergedFileAsts = [].concat.apply([], fileAsts);
            var globalAttrs = ast.globalAttrs(mergedFileAsts);
            for (var i = 0; i < files.length; i++) {
                var file = files[i];
                if (file.filename == 'JsonGen.swift')
                    continue;
                var lines = printer.makeFile(fileAsts[i], globalAttrs, file.outbase, file.outExists);
                if (lines.length == 0)
                    continue;
                var text = lines.join('\n');
                printFile(text, globalAttrs, file.outbase, file.outfile);
            }
        });
    }
}
function parseXcOutput(output) {
    // Separate outputs
    // Each non-error output starts with `(`, subsequent lines start with ` ` or `)`
    var lines = output.split(/\n/g);
    var xcoutputs = [];
    var errors = [];
    var current = [];
    for (var i = 0; i < lines.length; i++) {
        var line = lines[i];
        if (line.length == 0 || line[0] == ' ' || line[0] == ')') {
            current.push(line);
        }
        else {
            var merged = current.join('\n');
            if (current.length && merged.indexOf('(source_file') == 0)
                xcoutputs.push(merged);
            else if (current.length)
                errors.push(merged);
            current = [line];
        }
    }
    var merged = current.join('\n');
    if (current.length && merged.indexOf('(source_file') == 0)
        xcoutputs.push(merged);
    else if (current.length)
        errors.push(merged);
    return { errors: errors, outputs: xcoutputs };
}
function printFile(text, globalAttrs, outbase, outfile) {
    fs.writeFile(outfile, text, function (err) {
        if (err) {
            console.error(err);
        }
    });
}
exports.generate = generate;
