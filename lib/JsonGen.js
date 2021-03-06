"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : new P(function (resolve) { resolve(result.value); }).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
const bluebird = require('bluebird');
const exec = bluebird.promisify(require('child_process').exec, { multiArgs: true });
const fs = bluebird.promisifyAll(require('fs'));
const mkdirp = bluebird.promisify(require('mkdirp'));
const tmp = bluebird.promisify(require('tmp').dir);
const path = require('path');
require('./Extensions');
var ast = require('./SwiftAst');
var printer = require('./SwiftPrinter');
var headerLength = 9;
var swiftc = 'swiftc';
var sdk = '$(xcrun --show-sdk-path)';
// var swiftc = '/Applications/Xcode-9.app/Contents/Developer/Toolchains/XcodeDefault.xctoolchain/usr/bin/swiftc'
// var sdk = '/Applications/Xcode-9.app/Contents/Developer/Platforms/MacOSX.platform/Developer/SDKs/MacOSX10.12.sdk'
function generate() {
    return __awaiter(this, void 0, void 0, function* () {
        var usage = 'USAGE: $0 [--accessLevel level] [-o output_directory] source_files...\n\n'
            + '  Generates +JsonGen.swift files for all swift files supplied,\n'
            + '  filenames ending with +Extensions.swift are excluded.';
        var yargs = require('yargs')
            .usage(usage)
            .help()
            .alias('h', 'help')
            .alias('o', 'output')
            .alias('v', 'version')
            .describe('accessLevel', '"public" or "internal"')
            .describe('statham', 'Statham library directory')
            .describe('xcode', 'Path to Xcode.app')
            .describe('o', 'Output directory')
            .describe('v', 'Print version');
        var argv = yargs.argv;
        if (argv.version) {
            var pjson = require('../package.json');
            console.log(pjson.version);
            return;
        }
        const inputs = argv._;
        const outputDirectory = typeof (argv.output) == 'string' ? argv.output : null;
        const stathamDirectory = typeof (argv.statham) == 'string' ? argv.statham : null;
        const accessLevel = typeof (argv.accessLevel) == 'string' ? argv.accessLevel : null;
        const xcode = typeof (argv.xcode) == 'string' ? argv.xcode : null;
        // override swiftc and sdk paths
        if (xcode != null) {
            swiftc = xcode + '/Contents/Developer/Toolchains/XcodeDefault.xctoolchain/usr/bin/swiftc';
            sdk = xcode + '/Contents/Developer/Platforms/MacOSX.platform/Developer/SDKs/MacOSX10.12.sdk';
        }
        if (accessLevel != null && accessLevel != 'public' && accessLevel != 'internal') {
            console.error('accessLevel must be "public" or "internal"');
            return;
        }
        if (inputs.length == 0) {
            yargs.showHelp();
            return;
        }
        yield checkSwiftVersion();
        const stathamDir = yield compileStatham();
        if (outputDirectory) {
            yield mkdirp(outputDirectory);
        }
        handleFiles(inputs, accessLevel, stathamDir, outputDirectory);
        function checkSwiftVersion() {
            return __awaiter(this, void 0, void 0, function* () {
                const supportedVersions = ['Apple Swift version 3.0', 'Apple Swift version 3.1'];
                const [stdout] = yield exec('"' + swiftc + '" --version');
                const versions = supportedVersions.filter(version => stdout.startsWith(version));
                if (versions.length == 0) {
                    console.log('WARNING: Using untested swiftc version. swift-json-gen has been tested with:');
                    supportedVersions.forEach(function (version) {
                        console.log(' - ' + version);
                    });
                }
            });
        }
        function compileStatham() {
            return __awaiter(this, void 0, void 0, function* () {
                if (!stathamDirectory) {
                    return null;
                }
                const stathamTempDir = yield tmp();
                // From: http://stackoverflow.com/a/27047477/2597
                const cmd = 'xcrun "' + swiftc + '" -sdk "' + sdk + '"'
                    + ' -module-name Statham'
                    + ' -emit-module-path ' + stathamTempDir
                    + ' -emit-module ' + stathamDirectory + '/Sources/*.swift';
                yield exec(cmd);
                return stathamTempDir;
            });
        }
    });
}
function fullFilenames(input) {
    return __awaiter(this, void 0, void 0, function* () {
        const stat = yield fs.statAsync(input);
        if (stat.isDirectory()) {
            const inputFiles = yield fs.readdirAsync(input);
            const filenamePromises = inputFiles.map(fn => fullFilenames(path.join(input, fn)));
            const filenamesArray = yield bluebird.all(filenamePromises);
            return filenamesArray.flatMap(x => x);
        }
        else if (stat.isFile()) {
            return [input];
        }
        throw new Error("input is neither a file nor a directory");
    });
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
        outfile: outfile,
    };
}
function containsPodError(s) {
    return s.contains('error: use of undeclared type \'AnyJson\'')
        || s.contains('error: use of undeclared type \'JsonObject\'')
        || s.contains('error: use of undeclared type \'JsonArray\'')
        || s.contains('error: no such module \'Statham\'');
}
function handleFiles(inputs, accessLevel, stathamTempDir, outputDirectory) {
    return __awaiter(this, void 0, void 0, function* () {
        var inputFilenames = yield bluebird.all(inputs.map(fullFilenames));
        var filenames = inputFilenames.flatMap(x => x);
        var files = filenames
            .map(fn => fileDescription(fn, filenames, outputDirectory))
            .filter(function (f) {
            var isExtensions = f.filename.indexOf('+Extensions.swift') > 0;
            var isJsonGen = f.filename.indexOf('+JsonGen.swift') > 0;
            var isSwift = f.filename.indexOf('.swift') > 0;
            return isSwift && !isJsonGen && !isExtensions;
        });
        var filenamesString = files.map(f => '"' + f.fullname + '"').join(' ');
        var statham = '';
        if (stathamTempDir) {
            statham = ' -I ' + stathamTempDir + ' -L ' + stathamTempDir + ' -lStatham -module-link-name Statham';
        }
        var cmd = 'xcrun "' + swiftc + '"' + statham + ' -sdk "' + sdk + '" -dump-ast ' + filenamesString;
        var opts = {
            maxBuffer: 200 * 1024 * 1024
        };
        const [stdout, stderr] = yield exec(cmd, opts);
        var parseResult = parseXcOutput(stderr);
        var xcoutputs = parseResult.outputs;
        var errors = parseResult.errors;
        // If an actual error (not a `(source_file`), print and stop
        if (errors.length) {
            errors.forEach(error => {
                console.error(error);
            });
            if (errors.any(containsPodError) && !stathamTempDir) {
                console.error('');
                console.error('When using Statham library include argument: --statham=Pods/Statham');
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
            const file = files[i];
            const fileAst = fileAsts[i];
            if (file.filename == 'JsonGen.swift')
                continue;
            var lines = printer.makeFile(fileAst, accessLevel, globalAttrs, file.outbase);
            if (lines.length == 0)
                continue;
            var text = lines.join('\n');
            yield printFile(text, file.outfile);
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
function printFile(text, outfile) {
    return __awaiter(this, void 0, void 0, function* () {
        // Ignore first 4? lines (containing only generated date)
        var outputBody = text.split('\n').slice(headerLength).join('\n');
        try {
            const existing = yield fs.readFileAsync(outfile, 'utf8');
            if (existing) {
                var existingBody = existing.split('\n').slice(headerLength).join('\n');
                // No changes since existing
                if (outputBody == existingBody)
                    return;
            }
        }
        catch (_) {
            // If no exising file and no output body
            if (outputBody == '')
                return;
        }
        yield fs.writeFileAsync(outfile, text, 'utf8');
    });
}
exports.generate = generate;
