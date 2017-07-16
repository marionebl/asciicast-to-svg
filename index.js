'use strict'

const Terminal = require('headless-terminal')
const colors = require('./colors');
const h = require('virtual-dom/virtual-hyperscript/svg');
const diff = require('virtual-dom/diff');
const hash = require('shorthash');
const {omit, isEqual} = require('lodash');

module.exports = renderAt
module.exports.renderAt = renderAt;
module.exports.animate = animate;
module.exports.createRenderer = createRenderer;

// bit masks, see https://github.com/dtinth/screen-buffer#cell-attributes
const flags = [
	['bg', 9],
	['fg', 9],
	['bold', 1],
	['underline', 1],
	['inverse', 1]
]

const shifts = {}
const masks = {}

let offset = 0
for (let [name, size] of flags) {
	shifts[name] = offset
	masks[name] = parseInt('1'.repeat(size) + '0'.repeat(offset), 2)
	offset += size
}

function renderAt(asciicast, time) {
	const renderer = createRenderer(asciicast)

	let t = 0
	for (let [delay, data] of asciicast.stdout) {
		t += delay
		if (t > time) break
		renderer.write(data)
	}

	return renderer.render();
}

function animate(cast) {
	const renderer = createRenderer(cast);
	const delays = [];

	const frames = cast.stdout
		.map(([delay, data], i) => {
			renderer.write(data);
			delays.push(delay);
			const start = delays.reduce((a, d) => a += d, 0);
			const next = cast.stdout[i + 1];
			const end = next ? start + next[0] : cast.duration;
			return renderer.render({component: 'g', start, end});
		});

	return Screen({width: cast.width, height: cast.height}, frames);
}


function matrix(b) {
	let rows = [];

	for (let y = 0; y < b.getRows(); y++) {
		rows[y] = [];

		for (let x = 0; x < b.getCols(y); x++) {
			const [raw, children] = b.getCell(y, x);
			if (!children) continue;

			const inverse = !!((raw & masks.inverse) >> shifts.inverse);
			const underline = !!((raw & masks.underline) >> shifts.underline);
			const bold = !!((raw & masks.bold) >> shifts.bold);
			const fg = colors[(raw & masks.fg) >> shifts.fg] || '#fff';
			const bg = colors[(raw & masks.bg) >> shifts.bg] || '#000';

			if (children === ' ') {
				const [, pre] = b.getCell(y, x - 1);
				const [, post] = b.getCell(y, x + 1);
				if (!pre || pre === ' ' || !post || post === ' ') {
					continue;
				}
			}

			const props = {x, y, fg, bg, inverse, underline, bold};
			rows[y].push({props, children});
		}
	}

	return rows;
}

function createRenderer(meta) {
	const t = new Terminal(meta.width, meta.height)

	const write = (diff) => t.write(diff);
	const text = () => b.toString();

	const render = (props = {}) => {
		const rows = group(matrix(t.displayBuffer));
		const cells = rows.reduce((rows, groups) => [...rows, ...groups.map(g => Group(g.props, g.children))], []);

		if (!props.component || props.component === 'svg') {
			return Screen({width: meta.width, height: meta.height}, cells);
		} else {
			if (cells.length === 0) {
				return null;
			}

			const startFrame = props.start / (meta.duration / 100);
			const endFrame = props.end / (meta.duration / 100);

			const name = `frame-${String(props.start).replace('.', '-')}`;
			return h('g', {class: `${name} frame`}, [
				h('style', {type: 'text/css'}, [
				`
				.${name} {
					opacity: 0;
					animation-name: ${name};
					animation-duration: ${meta.duration}s;
					animation-timing-function: steps(1, end);
					animation-iteration-count: infinite;
				}
				@keyframes ${name} {
					from {
						opacity: 0;
					}
					${startFrame}% {
						opacity: 1;
					}
					${endFrame}% {
						opacity: 1;
					}
					to {
						opacity: 0;
					}
				}
				`
				]),
				h('rect', {
					width: meta.width * 10,
					height: (meta.height * 19) + 30,
					style: {
						fill: '#000'
					}
				}),
				...cells
			]);
		}
	}

	return {write, text, render};
}

const emitted = [];

function Group(props, children) {
	const x = projectX(props.x);
	const y = projectY(props.y + .8);

	const style = {
		fill: props.fg ? props.fg : null,
		fontWeight: props.bold ? 'bold' : null,
		textDecoration: props.underline ? 'underline' : null
	};

	const css = [
		style.fill && `fill: ${style.fill}`,
		style.fontWeight && `font-weight: ${style.fontWeight}`,
		style.textDecoration && `text-decoration: ${style.textDecoration}`
	].filter(Boolean).join(';');

	const has = css.length > 0;
	const id = has ? `t${hash.unique(JSON.stringify(style))}` : null;

	const emit = emitted.includes(id) || !has
		? null
		: h('style', {}, `.${id} {${css}}`);

	if (emit) {
		emitted.push(id);
	}

	return h('text', {
		className: has ? id : null,
		x: String(x),
		y: String(y)
	}, [
		emit,
		children
	])
}

function Screen(props = {}, children = []) {
	const width = props.width * 10;
	const height = props.height * 19.5;

	const outerWidth = (width + 32);
	const outerHeight = height + 127;
	const outerMiddle = outerWidth / 2;
	const innerWidth = width + 31;
	const t = (outerWidth / 2) - (outerMiddle / 2);

	return h('svg', {
		xmlns: 'http://www.w3.org/2000/svg',
		width: outerWidth,
		height: outerHeight,
		style: {
			fontFamily: "Consolas, Menlo, 'Bitstream Vera Sans Mono', monospace, 'Powerline Symbols'",
			fontSize: 15,
		}
	}, [
		h('g', {}, [
			h('rect', {
				rx: 5,
				ry: 5,
				y: 50,
				width: innerWidth,
				height: height + 76,
				style: {
					backgroundColor: '#000',
					stroke: '#303030',
					strokeWidth: 1,
				}
			}),
			h('circle', {
				cx: 20,
				cy: 70,
				r: 7.5,
				fill: '#ff5f58'
			}),
			h('circle', {
				cx: 45,
				cy: 70,
				r: 7.5,
				fill: '#ffbd2e'
			}),
			h('circle', {
				cx: 70,
				cy: 70,
				r: 7.5,
				fill: '#18c132'
			}),
			h('svg', {x: 15, y: 100}, children)
		]),
	]);
}

function group(rows) {
	return rows.map(cells => cells.reduce((groups, cell, i) => {
		const prev = groups[groups.length - 1] || {children: ''};

		if (prev.children.length === 0) {
			prev.props = cell.props;
			prev.children = cell.children;
			groups.push(prev);
			return groups;
		}

		if (isEqual(omit(cell.props, ['x', 'y']), omit(prev.props, ['x', 'y']))) {
			prev.children += cell.children;
			return groups;
		}

		groups.push({
			props: cell.props,
			children: cell.children
		});

		return groups;
	}, []));
}

function scale(dim) {
	return projectY(.5) + projectX(dim);
}

function projectX (x) {
	return Math.round(x * .5 * 2000) / 100;
}

function projectY (y) {
	return Math.round(y * 2000) / 100;
}
