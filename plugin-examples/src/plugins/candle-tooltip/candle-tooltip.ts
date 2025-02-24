import { CanvasRenderingTarget2D } from "fancy-canvas";
import {
	CrosshairMode,
	IPrimitivePaneRenderer,
	IPrimitivePaneView,
	MouseEventParams,
	PrimitivePaneViewZOrder,
	ISeriesPrimitive,
	SeriesAttachedParameter,
	CandlestickData,
	Time,
	LineData,
	WhitespaceData,
} from "lightweight-charts";
import { TooltipElement, TooltipOptions } from "./candle-tooltip-element";
import { positionsLine } from "../../helpers/dimensions/positions";
import { convertTime, formattedDate } from "../../helpers/time";

class TooltipCrosshairLinePaneRenderer implements IPrimitivePaneRenderer {
	_data: TooltipCrosshairLineData;

	constructor(data: TooltipCrosshairLineData) {
		this._data = data;
	}

	draw(target: CanvasRenderingTarget2D) {
		if (!this._data.visible) return;
		target.useBitmapCoordinateSpace((scope) => {
			const ctx = scope.context;
			const crosshairPos = positionsLine(
				this._data.x,
				scope.horizontalPixelRatio,
				1
			);
			ctx.fillStyle = this._data.color;
			ctx.fillRect(
				crosshairPos.position,
				this._data.topMargin * scope.verticalPixelRatio,
				crosshairPos.length,
				scope.bitmapSize.height
			);
		});
	}
}

class MultiTouchCrosshairPaneView implements IPrimitivePaneView {
	_data: TooltipCrosshairLineData;
	constructor(data: TooltipCrosshairLineData) {
		this._data = data;
	}

	update(data: TooltipCrosshairLineData): void {
		this._data = data;
	}

	renderer(): IPrimitivePaneRenderer | null {
		return new TooltipCrosshairLinePaneRenderer(this._data);
	}

	zOrder(): PrimitivePaneViewZOrder {
		return "bottom";
	}
}

interface TooltipCrosshairLineData {
	x: number;
	visible: boolean;
	color: string;
	topMargin: number;
}

const defaultOptions: TooltipPrimitiveOptions = {
	lineColor: "rgba(0, 0, 0, 0.2)",
	openExtractor: (data: LineData | CandlestickData | WhitespaceData) => {
		if ((data as CandlestickData).open !== undefined) {
			return (data as CandlestickData).open.toFixed(2);
		}
		return "";
	},
	closeExtractor: (data: LineData | CandlestickData | WhitespaceData) => {
		if ((data as CandlestickData).close !== undefined) {
			return (data as CandlestickData).close.toFixed(2);
		}
		return "";
	},
	highExtractor: (data: LineData | CandlestickData | WhitespaceData) => {
		if ((data as CandlestickData).high !== undefined) {
			return (data as CandlestickData).high.toFixed(2);
		}
		return "";
	},
	lowExtractor: (data: LineData | CandlestickData | WhitespaceData) => {
		if ((data as CandlestickData).low !== undefined) {
			return (data as CandlestickData).low.toFixed(2);
		}
		return "";
	},
	percentExtractor: (data: LineData | CandlestickData | WhitespaceData) => {
		if ((data as CandlestickData).low !== undefined) {
			let d = (data as CandlestickData);
			return ((d.close - d.open) / d.open * 100).toFixed(2);
		}
		return "";
	},
};

export interface TooltipPrimitiveOptions {
	lineColor: string;
	tooltip?: Partial<TooltipOptions>;
	openExtractor: <T extends WhitespaceData>(dataPoint: T) => string;
	closeExtractor: <T extends WhitespaceData>(dataPoint: T) => string;
	highExtractor: <T extends WhitespaceData>(dataPoint: T) => string;
	lowExtractor: <T extends WhitespaceData>(dataPoint: T) => string;
	percentExtractor: <T extends WhitespaceData>(dataPoint: T) => string;
}

export class TooltipPrimitive implements ISeriesPrimitive<Time> {
	private _options: TooltipPrimitiveOptions;
	private _tooltip: TooltipElement | undefined = undefined;
	_paneViews: MultiTouchCrosshairPaneView[];
	_data: TooltipCrosshairLineData = {
		x: 0,
		visible: false,
		color: "rgba(0, 0, 0, 0.2)",
		topMargin: 0,
	};
	_attachedParams: SeriesAttachedParameter<Time> | undefined;

	constructor(options: Partial<TooltipPrimitiveOptions>) {
		this._options = {
			...defaultOptions,
			...options,
		};
		this._paneViews = [new MultiTouchCrosshairPaneView(this._data)];
	}

	attached(param: SeriesAttachedParameter<Time>): void {
		this._attachedParams = param;
		this._setCrosshairMode();
		param.chart.subscribeCrosshairMove(this._moveHandler);
		this._createTooltipElement();
	}

	detached(): void {
		const chart = this.chart();
		if (chart) {
			chart.unsubscribeCrosshairMove(this._moveHandler);
		}
	}

	paneViews() {
		return this._paneViews;
	}

	updateAllViews() {
		this._paneViews.forEach((pw) => pw.update(this._data));
	}

	setData(data: TooltipCrosshairLineData) {
		this._data = data;
		this.updateAllViews();
		this._attachedParams?.requestUpdate();
	}

	currentColor() {
		return this._options.lineColor;
	}

	chart() {
		return this._attachedParams?.chart;
	}

	series() {
		return this._attachedParams?.series;
	}

	applyOptions(options: Partial<TooltipPrimitiveOptions>) {
		this._options = {
			...this._options,
			...options,
		};
		if (this._tooltip) {
			this._tooltip.applyOptions({ ...this._options.tooltip });
		}
	}

	private _setCrosshairMode() {
		const chart = this.chart();
		if (!chart) {
			throw new Error(
				"Unable to change crosshair mode because the chart instance is undefined"
			);
		}
		chart.applyOptions({
			crosshair: {
				mode: CrosshairMode.Magnet,
				vertLine: {
					visible: false,
					labelVisible: false,
				},
				horzLine: {
					visible: false,
					labelVisible: false,
				},
			},
		});
	}

	private _moveHandler = (param: MouseEventParams) => this._onMouseMove(param);

	private _hideTooltip() {
		if (!this._tooltip) return;
		this._tooltip.updateTooltipContent({
			title: "",
			time: "",
			open: "",
			close: "",
			high: "",
			low: "",
			percent: ''
		});
		this._tooltip.updatePosition({
			paneX: 0,
			paneY: 0,
			visible: false,
		});
	}

	private _hideCrosshair() {
		this._hideTooltip();
		this.setData({
			x: 0,
			visible: false,
			color: this.currentColor(),
			topMargin: 0,
		});
	}

	private _onMouseMove(param: MouseEventParams) {
		const chart = this.chart();
		const series = this.series();
		const logical = param.logical;
		if (!logical || !chart || !series) {
			this._hideCrosshair();
			return;
		}
		const data = param.seriesData.get(series);
		if (!data) {
			this._hideCrosshair();
			return;
		}
		const open = this._options.openExtractor(data);
		const close = this._options.closeExtractor(data);
		const high = this._options.highExtractor(data);
		const low = this._options.lowExtractor(data);
		const percent = this._options.percentExtractor(data);
		const coordinate = chart.timeScale().logicalToCoordinate(logical);
		const time = formattedDate(
			param.time ? convertTime(param.time) : undefined
		);
		if (this._tooltip) {
			const tooltipOptions = this._tooltip.options();
			const topMargin =
				tooltipOptions.followMode == "top" ? tooltipOptions.topOffset + 10 : 0;
			this.setData({
				x: coordinate ?? 0,
				visible: coordinate !== null,
				color: this.currentColor(),
				topMargin,
			});
			this._tooltip.updateTooltipContent({
				time,
				open: `开: ${open}`,
				close: `收: ${close}`,
				high: `高: ${high}`,
				low: `低: ${low}`,
				percent: `幅: ${percent}%`
			});
			this._tooltip.updatePosition({
				paneX: param.point?.x ?? 0,
				paneY: param.point?.y ?? 0,
				visible: true,
			});
		}
	}

	private _createTooltipElement() {
		const chart = this.chart();
		if (!chart)
			throw new Error("Unable to create Tooltip element. Chart not attached");
		this._tooltip = new TooltipElement(chart, {
			...this._options.tooltip,
		});
	}
}
