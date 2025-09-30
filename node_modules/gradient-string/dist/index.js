import chalk from 'chalk';
import tinygradient from 'tinygradient';
const gradient = (...colors) => {
    let gradient;
    let options;
    if (colors.length === 0) {
        throw new Error('Missing gradient colors');
    }
    if (!Array.isArray(colors[0])) {
        // Deprecated varargs syntax
        if (colors.length === 1) {
            throw new Error(`Expected an array of colors, received ${JSON.stringify(colors[0])}`);
        }
        gradient = tinygradient(...colors);
    }
    // New syntax: (colors[], options)
    else {
        gradient = tinygradient(colors[0]);
        options = validateOptions(colors[1]);
    }
    const fn = (str, deprecatedOptions) => {
        return applyGradient(str ? str.toString() : '', gradient, deprecatedOptions ?? options);
    };
    fn.multiline = (str, deprecatedOptions) => multiline(str ? str.toString() : '', gradient, deprecatedOptions ?? options);
    return fn;
};
const getColors = (gradient, options, count) => {
    return options.interpolation?.toLowerCase() === 'hsv'
        ? gradient.hsv(count, options.hsvSpin?.toLowerCase() || false)
        : gradient.rgb(count);
};
function applyGradient(str, gradient, opts) {
    const options = validateOptions(opts);
    const colorsCount = Math.max(str.replace(/\s/g, '').length, gradient.stops.length);
    const colors = getColors(gradient, options, colorsCount);
    let result = '';
    for (const s of str) {
        result += s.match(/\s/g) ? s : chalk.hex(colors.shift()?.toHex() || '#000')(s);
    }
    return result;
}
export function multiline(str, gradient, opts) {
    const options = validateOptions(opts);
    const lines = str.split('\n');
    const maxLength = Math.max(...lines.map((l) => l.length), gradient.stops.length);
    const colors = getColors(gradient, options, maxLength);
    const results = [];
    for (const line of lines) {
        const lineColors = colors.slice(0);
        let lineResult = '';
        for (const l of line) {
            lineResult += chalk.hex(lineColors.shift()?.toHex() || '#000')(l);
        }
        results.push(lineResult);
    }
    return results.join('\n');
}
function validateOptions(opts) {
    const options = { interpolation: 'rgb', hsvSpin: 'short', ...opts };
    if (opts !== undefined && typeof opts !== 'object') {
        throw new TypeError(`Expected \`options\` to be an \`object\`, got \`${typeof opts}\``);
    }
    if (typeof options.interpolation !== 'string') {
        throw new TypeError(`Expected \`options.interpolation\` to be \`rgb\` or \`hsv\`, got \`${typeof options.interpolation}\``);
    }
    if (options.interpolation.toLowerCase() === 'hsv' && typeof options.hsvSpin !== 'string') {
        throw new TypeError(`Expected \`options.hsvSpin\` to be a \`short\` or \`long\`, got \`${typeof options.hsvSpin}\``);
    }
    return options;
}
const aliases = {
    atlas: { colors: ['#feac5e', '#c779d0', '#4bc0c8'], options: {} },
    cristal: { colors: ['#bdfff3', '#4ac29a'], options: {} },
    teen: { colors: ['#77a1d3', '#79cbca', '#e684ae'], options: {} },
    mind: { colors: ['#473b7b', '#3584a7', '#30d2be'], options: {} },
    morning: { colors: ['#ff5f6d', '#ffc371'], options: { interpolation: 'hsv' } },
    vice: { colors: ['#5ee7df', '#b490ca'], options: { interpolation: 'hsv' } },
    passion: { colors: ['#f43b47', '#453a94'], options: {} },
    fruit: { colors: ['#ff4e50', '#f9d423'], options: {} },
    instagram: { colors: ['#833ab4', '#fd1d1d', '#fcb045'], options: {} },
    retro: {
        colors: ['#3f51b1', '#5a55ae', '#7b5fac', '#8f6aae', '#a86aa4', '#cc6b8e', '#f18271', '#f3a469', '#f7c978'],
        options: {},
    },
    summer: { colors: ['#fdbb2d', '#22c1c3'], options: {} },
    rainbow: { colors: ['#ff0000', '#ff0100'], options: { interpolation: 'hsv', hsvSpin: 'long' } },
    pastel: { colors: ['#74ebd5', '#74ecd5'], options: { interpolation: 'hsv', hsvSpin: 'long' } },
};
function gradientAlias(alias) {
    const result = (str) => gradient(...alias.colors)(str, alias.options);
    result.multiline = (str = '') => gradient(...alias.colors).multiline(str, alias.options);
    return result;
}
export default gradient;
export const atlas = gradientAlias(aliases.atlas);
export const cristal = gradientAlias(aliases.cristal);
export const teen = gradientAlias(aliases.teen);
export const mind = gradientAlias(aliases.mind);
export const morning = gradientAlias(aliases.morning);
export const vice = gradientAlias(aliases.vice);
export const passion = gradientAlias(aliases.passion);
export const fruit = gradientAlias(aliases.fruit);
export const instagram = gradientAlias(aliases.instagram);
export const retro = gradientAlias(aliases.retro);
export const summer = gradientAlias(aliases.summer);
export const rainbow = gradientAlias(aliases.rainbow);
export const pastel = gradientAlias(aliases.pastel);
// Deprecated exports
gradient.atlas = atlas;
gradient.cristal = cristal;
gradient.teen = teen;
gradient.mind = mind;
gradient.morning = morning;
gradient.vice = vice;
gradient.passion = passion;
gradient.fruit = fruit;
gradient.instagram = instagram;
gradient.retro = retro;
gradient.summer = summer;
gradient.rainbow = rainbow;
gradient.pastel = pastel;
