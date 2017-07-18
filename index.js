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

	const frames = cast.stdout
		.map(([_, data], index) => {
			renderer.write(data);
			return renderer.render({component: 'g', index});
		});

	const ds = cast.stdout.map(([d]) => d);

	return Screen({
		duration: cast.duration,
		height: cast.height,
		keys: ds
			.map((d, i) => ds.slice(0, i + 1).reduce((s, o) => s += o), 0)
			.map(s => s / (cast.duration / 100)),
		tite: cast.title || 'asciicast',
		width: cast.width,
	}, frames);
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
		const buffer = t.displayBuffer;
		const rows = group(matrix(buffer));
		const cells = rows.reduce((rows, groups) => [...rows, ...groups.map(g => Group(g.props, g.children))], []);

		if (!props.component || props.component === 'svg') {
			return Screen({
				height: meta.height,
				width: meta.width,
				title: meta.title || 'asciicast'
			}, cells);
		} else {
			if (cells.length === 0) {
				return null;
			}

			return h('svg', {
				x: ((meta.width * 10) + 30) * props.index
			}, [
				h('rect', {
					width: projectX(1),
					height: projectY(1),
					x: projectX(buffer.cursorX),
					y: projectY(buffer.cursorY),
					fill: '#42535b'
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
	const frameWidth = outerWidth - 2;

	const keyframes = (props.keys || [])
		.map((key, index) => `
			@keyframe ${key}% {
				transform: translateX(-${frameWidth * (index + 1)}px);
			}
		`)
		.join('\n');

	const css = (props.keys || []).length > 0
		? `
		.viewbox {
			animation-name: sequence;
			animation-duration: ${props.duration}s;
			animation-timing-function: steps(${children.length}, end);
			animation-iteration-count: infinite;
		}
		@keyframes sequence {
			from {
				transform: translateX(0);
			}
			${keyframes}
			to {
				transform: translateX(-${frameWidth * children.length}px);
			}
		}
	` : ``;

	return h('svg', {
		xmlns: 'http://www.w3.org/2000/svg',
		width: outerWidth,
		height: outerHeight,
		style: {
			fontFamily: "Consolas, Menlo, 'Bitstream Vera Sans Mono', monospace, 'Powerline Symbols'",
			fontSize: projectY(.8),
		}
	}, [
		h('style', {type: 'text/css'}, css),
		h('g', [
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
			h('text', {
				x: outerWidth / 2,
				y: 75,
				style: {
					fill: 'rgb(85,85,85)',
					fontSize: '16px',
					textAnchor: 'middle'
				}
			}, props.title),
			h('g', {class: 'viewbox'}, [
				h('svg', {
					x: 15,
					y: 100,
					width: outerWidth * children.length
				}, children)
			])
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
