import '@testing-library/jest-dom';

// jsdom canvas throws "Not implemented"; override minimal API used by LotteryCard.
if (typeof HTMLCanvasElement !== "undefined") {
	Object.defineProperty(HTMLCanvasElement.prototype, "getContext", {
		configurable: true,
		value: () => {
			const gradient = { addColorStop: () => undefined };
			return {
				clearRect: () => undefined,
				createLinearGradient: () => gradient,
				fillRect: () => undefined,
				fillText: () => undefined,
				beginPath: () => undefined,
				arc: () => undefined,
				fill: () => undefined,
				getImageData: (_x: number, _y: number, w: number, h: number) => ({
					data: new Uint8ClampedArray(Math.max(0, w) * Math.max(0, h) * 4),
				}),
				set fillStyle(_v: unknown) {
					/* noop */
				},
				set font(_v: unknown) {
					/* noop */
				},
				set textAlign(_v: unknown) {
					/* noop */
				},
				set textBaseline(_v: unknown) {
					/* noop */
				},
				set globalCompositeOperation(_v: unknown) {
					/* noop */
				},
			};
		},
	});
}
