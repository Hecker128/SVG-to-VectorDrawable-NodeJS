const { JSDOM } = require("jsdom");

async function readStdin() {
	const chunks = [];
	for await (const chunk of process.stdin) chunks.push(chunk);
	return Buffer.concat(chunks).toString('utf8');
}

function normalizeColor(color) {
	if (color.startsWith('#')) {
		if (color.length === 4) {
			const r = color[1];
			const g = color[2];
			const b = color[3];
			return `#FF${r}${r}${g}${g}${b}${b}`;
		} else if (color.length === 7) {
			return `#FF${color.slice(1)}`;
		}
	} else if (color.startsWith('rgb')) {
		const match = color.match(/rgb\((\d+),\s*(\d+),\s*(\d+)\)/);
		if (match) {
			const r = parseInt(match[1]).toString(16).padStart(2, '0');
			const g = parseInt(match[2]).toString(16).padStart(2, '0');
			const b = parseInt(match[3]).toString(16).padStart(2, '0');
			return `#FF${r}${g}${b}`;
		}
	}
	return '#FF000000';
}

function convertElementToPathData(element) {
	const tagName = element.tagName.toLowerCase();

	if (tagName === 'path') {
		return element.getAttribute('d') || '';
	} else if (tagName === 'rect') {
		const x = parseFloat(element.getAttribute('x') || '0');
		const y = parseFloat(element.getAttribute('y') || '0');
		const width = parseFloat(element.getAttribute('width') || '0');
		const height = parseFloat(element.getAttribute('height') || '0');
		if (width <= 0 || height <= 0) return null;

		return `M${x},${y} h${width} v${height} h${-width} Z`;
	} else if (tagName === 'circle') {
		const cx = parseFloat(element.getAttribute('cx') || '0');
		const cy = parseFloat(element.getAttribute('cy') || '0');
		const r = parseFloat(element.getAttribute('r') || '0');
		if (r <= 0) return null;

		const kappa = 0.5522847498;
		const kr = r * kappa;
		return `M${cx - r},${cy} ` +
			`C${cx - r},${cy - kr} ${cx - kr},${cy - r} ${cx},${cy - r} ` +
			`C${cx + kr},${cy - r} ${cx + r},${cy - kr} ${cx + r},${cy} ` +
			`C${cx + r},${cy + kr} ${cx + kr},${cy + r} ${cx},${cy + r} ` +
			`C${cx - kr},${cy + r} ${cx - r},${cy + kr} ${cx - r},${cy} Z`;
	}

	return null;
}

function convertToVectorDrawable(svg) {
	const dom = new JSDOM(svg, { contentType: "image/svg+xml" });
	const svgElement = dom.window.document.documentElement;

	const viewBox = svgElement.getAttribute('viewBox');
	const [minX, minY, width, height] = viewBox.split(/\s+/).map(Number);

	let vectorDrawable = `<?xml version="1.0" encoding="utf-8"?>\n`;
	vectorDrawable += `<vector xmlns:android="http://schemas.android.com/apk/res/android"\n`;
	vectorDrawable += `    android:width="${width}dp"\n`;
	vectorDrawable += `    android:height="${height}dp"\n`;
	vectorDrawable += `    android:viewportWidth="${width}"\n`;
	vectorDrawable += `    android:viewportHeight="${height}">\n`;

	const paths = [];
	const elements = svgElement.querySelectorAll('path, rect, circle');
	elements.forEach(element => {
		const pathData = convertElementToPathData(element);
		if (pathData) {
			const fillColor = element.getAttribute('fill') || '#000000';
			const strokeColor = element.getAttribute('stroke') || 'none';
			const strokeWidth = element.getAttribute('stroke-width') || '0';

			let path = `    <path\n`;
			path += `        android:pathData="${pathData}"\n`;
			if (fillColor !== 'none') {
				path += `        android:fillColor="${normalizeColor(fillColor)}"\n`;
			}
			if (strokeColor !== 'none') {
				path += `        android:strokeColor="${normalizeColor(strokeColor)}"\n`;
				path += `        android:strokeWidth="${strokeWidth}"\n`;
			}
			path += `    />\n`;
			paths.push(path);
		}
	});

	vectorDrawable += paths.join('');
	vectorDrawable += `</vector>`;

	return vectorDrawable;
}

async function main() {
	console.log(await convertToVectorDrawable(await readStdin()));
}

main()
