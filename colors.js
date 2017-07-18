'use strict'

/* const ansi = [
	'0,0,0',
	'187,0,0',
	'0,187,0',
	'187,187,0',
	'0,0,187',
	'187,0,187',
	'0,187,187',
	'255,255,255',
	'85,85,85',
	'255,85,85',
	'0,255,0',
	'255,255,85',
	'85,85,255',
	'255,85,255',
	'85,255,255',
	'255,255,255'
]; */

const ansi = [
	'#42535b',
	'#cf3c40',
	'#9fcc4e',
	'#e7ce61',
	'#50b3dd',
	'#9e70c2',
	'#9fcc4e',
	'#f1f1f1',
	'#1d262b',
	'#cf3c40',
	'#9dcb4e',
	'#e7ce61',
	'#50b2dc',
	'#9e70c2',
	'#9fcc4e',
	'#ffffff'
];

const colors = [...ansi];

// 16 to 231 RGB 6 x 6 x 6
const levels = [0, 95, 135, 175, 215, 255]

for (let r = 0; r < 6; r++) {
	for (let g = 0; g < 6; g++) {
		for (let b = 0; b < 6; b++) {
			colors.push('#' + [
				('0' + parseInt(levels[r])).slice(-2),
				('0' + parseInt(levels[g])).slice(-2),
				('0' + parseInt(levels[b])).slice(-2)
			].join(''))
		}
	}
}

// 232 to 255 grayscale
const grayscale = [
	'08', '12', '1c', '26', '30', '3a', '44', '4e', '58', '62', '6c', '76',
	'80', '8a', '94', '9e', 'a8', 'b2', 'bc', 'c6', 'd0', 'da', 'e4', 'ee'
]

for (let hex of grayscale) colors.push('#' + hex.repeat(3))

module.exports = colors
module.exports.fg = '#d4d6d6';
module.exports.bg = '#151718';
