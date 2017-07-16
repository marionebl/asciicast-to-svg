#!/usr/bin/env node
const meow = require('meow');
const getStdin = require('get-stdin');
const toString = require('vdom-to-html')

const pkg = require('./package');
const renderAt = require('.');
const {animate} = require('.');

withCli(main, `
	Usage:
		asciicast-to-svg

	Options:
		--animate

	Examples:
		cat asciicast.json | asciicast-to-svg
		asciicast-to-svg < asciicast.json
`);

function main(cli) {
	const error = cliError(cli);
	const input = parseFloat(cli.input[0]);

	return getStdin()
		.then(stdin => {
			if (!stdin && !cli.flags.file) {
				throw error('stdin [input] is required');
			}

			const cast = JSON.parse(stdin);

			if (cli.flags.animate) {
				return emit(animate(cast));
			}

			const render = (at, options) => renderAt(cast, at, options);
			const at = Number.isNaN(input) ? cast.duration : input;
			return emit(render(at));
		});
}

function cliError(cli) {
	return message => {
		const err = new Error(message);
		err.help = cli.showHelp;
		err.controlled = true;
		return err;
	};
}

function emit(svg) {
	return toString(svg).replace('<svg ', '<svg xmlns="http://www.w3.org/2000/svg" ');
}

function withCli(main, help) {
	return main(meow(help))
		.then(output => output && console.log(output))
		.catch(err => {
			if (err.controlled && err.help) {
				console.error(err.message);
				return err.help(1);
			}
			throw err;
		});
}

/* const minimist = require('minimist')
const toString = require('vdom-to-html')

const pkg = require('./package.json')
const renderAt = require('.')

const argv = minimist(process.argv.slice(2))

if (argv.help || argv.h) {
	process.stdout.write(`
Usage:
    asciicast-to-svg [time]

Arguments:
    time   Which frame to render, in seconds.

Examples:
    cat some-asciicast.json | asciicast-to-svg 2.3 > some-asciicast.svg
\n`)
	process.exit(0)
}

if (argv.version || argv.v) {
	process.stdout.write(`asciicast-to-svg v${pkg.version}\n`)
	process.exit(0)
}

const showError = (err) => {
	console.error(err)
	process.exit(1)
}

let asciicast = ''
process.stdin
.on('error', showError)
.on('data', (d) => {
	asciicast += d.toString('utf8')
})
.once('end', () => {
	try {
		asciicast = JSON.parse(asciicast)

		let seconds = parseFloat(argv._[0])
		if (Number.isNaN(seconds)) seconds = asciicast.duration

		const svg = toString(renderAt(asciicast, seconds))
		process.stdout.write(svg)
	} catch (err) {
		return showError(err)
	}
}) */
