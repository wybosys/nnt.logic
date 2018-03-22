import {MAX_INT, MIN_INT, toInt} from "./kernel";
import {logger} from "./logger";

export class BoundingBox {

    add(x: number, y: number): this {
        this.minX = Math.min(this.minX, x);
        this.maxX = Math.max(this.maxX, x);
        this.minY = Math.min(this.minY, y);
        this.maxY = Math.max(this.maxY, y);
        return this;
    }

    adds(pts: number[]): this {
        if (pts.length % 2) {
            // 不是2的整数倍
            logger.warn("输入的数据不是2的整数倍");
        }
        const len = toInt(pts.length / 2) * 2;
        for (let i = 0; i < len; i += 2) {
            this.add(pts[i], pts[i + 1]);
        }
        return this;
    }

    moveToOrigin(): this {
        this.maxX -= this.minX;
        this.maxY -= this.minY;
        this.minX = this.minY = 0;
        return this;
    }

    get width(): number {
        return this.maxX - this.minX;
    }

    get height(): number {
        return this.maxY - this.minY;
    }

    reset(bbx: BoundingBox = null): this {
        if (bbx == null) {
            this.minX = MAX_INT;
            this.maxX = MIN_INT;
            this.minY = MAX_INT;
            this.maxY = MIN_INT;
            return this;
        }

        this.minX = bbx.minX;
        this.maxX = bbx.maxX;
        this.minY = bbx.minY;
        this.maxY = bbx.maxY;
        return this;
    }

    minX: number = MAX_INT;
    maxX: number = MIN_INT;
    minY: number = MAX_INT;
    maxY: number = MIN_INT;
}