import { createChart, CandlestickSeries } from "lightweight-charts";
import { generateCandleData } from "../../../sample-data";
import { TooltipPrimitive } from "../candle-tooltip";

const chart = ((window as unknown as any).chart = createChart("chart", {
	autoSize: true,
	grid: {
		vertLines: {
			visible: false,
		},
		horzLines: {
			visible: false,
		},
	},
	timeScale: {
		borderVisible: false,
	},
	rightPriceScale: {
		borderVisible: false,
	},
}));

const series = chart.addSeries(CandlestickSeries);
series.setData(generateCandleData());

const tooltipPrimitive = new TooltipPrimitive({
	lineColor: "rgba(0, 0, 0, 0.2)",
	tooltip: {
		followMode: "top",
	},
});

series.attachPrimitive(tooltipPrimitive);

const trackingButtonEl = document.querySelector("#tracking-button");
if (trackingButtonEl) trackingButtonEl.classList.add("grey");
const topButtonEl = document.querySelector("#top-button");
if (trackingButtonEl) {
	trackingButtonEl.addEventListener("click", function () {
		trackingButtonEl.classList.remove("grey");
		if (topButtonEl) topButtonEl.classList.add("grey");
		tooltipPrimitive.applyOptions({
			tooltip: {
				followMode: "tracking",
			},
		});
	});
}

if (topButtonEl) {
	topButtonEl.addEventListener("click", function () {
		topButtonEl.classList.remove("grey");
		if (trackingButtonEl) trackingButtonEl.classList.add("grey");
		tooltipPrimitive.applyOptions({
			tooltip: {
				followMode: "top",
			},
		});
	});
}
