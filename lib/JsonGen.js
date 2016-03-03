/// <reference path="node.d.ts" />
"use strict";
var exec = require('child_process').exec;
var path = require('path');
var fs = require('fs');
var mkdirp = require('mkdirp');
require('./Extensions');
var ast = require('./SwiftAst');
var printer = require('./SwiftPrinter');
var headerLength = 8;
function generate() {
    var supportedVersions = ['Apple Swift version 2.1', 'Apple Swift version 2.2'];
    exec('swiftc --version', function (error, stdout, stderr) {
        var versions = supportedVersions.filter(function (version) { return stdout.startsWith(version); });
        if (versions.length == 0) {
            console.log('WARNING: Using untested swiftc version. swift-json-gen has been tested with:');
            supportedVersions.forEach(function (version) {
                console.log(' - ' + version);
            });
        }
        processCmdArgs(function (error, inputs, outputDirectory) { return handleFiles(inputs, outputDirectory); });
    });
}
function processCmdArgs(cb) {
    var usage = 'USAGE: $0 [-o output_directory] source_files...\n\n'
        + '  Generates +JsonGen.swift files for all swift files supplied,\n'
        + '  filenames ending with +Extensions.swift are excluded.';
    var yargs = require('yargs')
        .usage(usage)
        .help()
        .alias('h', 'help')
        .alias('o', 'output')
        .alias('v', 'version')
        .describe('o', 'Output directory')
        .describe('v', 'Print version');
    var argv = yargs.argv;
    if (argv.version) {
        var pjson = require('../package.json');
        console.log(pjson.version);
        return;
    }
    var inputs = argv._;
    var outputDirectory = argv.output;
    if (inputs.length == 0) {
        yargs.showHelp();
        return;
    }
    if (typeof (outputDirectory) == 'string') {
        mkdirp(outputDirectory, function (err) { return cb(err, argv._, outputDirectory); });
    }
    else {
        cb(null, inputs);
    }
}
function fullFilenames(input) {
    if (fs.statSync(input).isDirectory()) {
        return fs.readdirSync(input).flatMap(function (fn) { return fullFilenames(path.join(input, fn)); });
    }
    else if (fs.statSync(input).isFile()) {
        return [input];
    }
    throw new Error("input is neither a file nor a directory");
}
function fileDescription(filename, allFilenames, outputDirectory) {
    var dirname = path.dirname(filename);
    var basename = path.basename(filename);
    var outbase = basename.replace('.swift', '+JsonGen.swift');
    var outfile = outputDirectory ? path.join(outputDirectory, outbase) : path.join(dirname, outbase);
    return {
        filename: basename,
        fullname: path.join(dirname, basename),
        outbase: outbase,
        outfile: outfile
    };
}
function containsPodError(s) {
    return s.contains('error: use of undeclared type \'AnyJson\'')
        || s.contains('error: use of undeclared type \'JsonObject\'')
        || s.contains('error: use of undeclared type \'JsonArray\'');
}
function handleFiles(inputs, outputDirectory) {
    var filenames = inputs.flatMap(fullFilenames);
    var files = filenames
        .map(function (fn) { return fileDescription(fn, filenames, outputDirectory); })
        .filter(function (f) {
        var isExtensions = f.filename.indexOf('+Extensions.swift') > 0;
        var isJsonGen = f.filename.indexOf('+JsonGen.swift') > 0;
        var isSwift = f.filename.indexOf('.swift') > 0;
        return isSwift && !isJsonGen && !isExtensions;
    });
    var filenamesString = files.map(function (f) { return '"' + f.fullname + '"'; }).join(' ');
    var swiftc = 'swiftc';
    // var swiftc = '/Applications/Xcode-beta.app/Contents/Developer/Toolchains/XcodeDefault.xctoolchain/usr/bin/swiftc'
    var cmd = 'xcrun ' + swiftc + ' -sdk "$(xcrun --show-sdk-path --sdk macosx)" -dump-ast ' + filenamesString;
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
            if (errors.any(containsPodError)) {
                console.error('');
                console.error('Using types from Statham library, include argument: --statham=Pods/Statham');
            }
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
            var lines = printer.makeFile(fileAsts[i], globalAttrs, file.outbase);
            if (lines.length == 0)
                continue;
            var text = lines.join('\n');
            printFile(text, globalAttrs, file.outbase, file.outfile);
        }
    });
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
    fs.readFile(outfile, 'utf8', function (err, existing) {
        // Ignore first 4 lines (containing only generated date)
        var outputBody = text.split('\n').slice(headerLength).join('\n');
        // No exising file and no output body
        if (err && outputBody == '')
            return;
        if (existing) {
            var existingBody = existing.split('\n').slice(headerLength).join('\n');
            // No changes since existing
            if (outputBody == existingBody)
                return;
        }
        fs.writeFile(outfile, text, 'utf8', function (err) {
            if (err) {
                console.error(err);
            }
        });
    });
}
exports.generate = generate;
