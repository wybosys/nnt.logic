import d3 = require("d3");
import jsdom = require("jsdom");
import {BoundingBox} from "./geometry";

type SELECTION = d3.Selection<d3.BaseType, {}, null, undefined>;

class SvgPoints {

    add(x: number, y: number): this {
        this._bbx.add(x, y);
        this._points.push(x, y);
        return this;
    }

    adds(pts: number[]): this {
        if (!pts.length)
            return this;
        this._bbx.adds(pts);
        this._points = this._points.concat(pts);
        return this;
    }

    // 裁剪空白的地方
    trim(): this {
        const dx = this._bbx.minX;
        const dy = this._bbx.minY;
        for (let i = 0, l = this._points.length; i < l; i += 2) {
            this._points[i] -= dx;
            this._points[i + 1] -= dy;
        }
        this._bbx.moveToOrigin();
        return this;
    }

    get width(): number {
        return this._bbx.width;
    }

    get height(): number {
        return this._bbx.height;
    }

    toString(): string {
        return this._points.join(",");
    }

    bbx(bbx: BoundingBox): this {
        this._bbx.reset(bbx);
        return this;
    }

    private _points = new Array<number>();
    private _bbx = new BoundingBox();
}

export class Svg {

    constructor() {
        this._dom = new jsdom.JSDOM(`<!DOCTYPE html>`);
        let body = d3.select(this._dom.window.document.body);
        this._svg = body.append("svg");
    }

    get element(): SELECTION {
        return this._svg;
    }

    line() {
        return d3.path();
    }

    points(): SvgPoints {
        return new SvgPoints();
    }

    toString(): string {
        return this._dom.serialize();
    }

    private _dom: jsdom.JSDOM;
    private _svg: SELECTION;
}
