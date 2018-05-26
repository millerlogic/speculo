// Copyright (C) 2018 Christopher E. Miller
//
// This Source Code Form is subject to the terms of the Mozilla Public
// License, v. 2.0. If a copy of the MPL was not distributed with this file,
// You can obtain one at https://mozilla.org/MPL/2.0/.

import * as base from "./base";
import * as util from "./util";
import * as surface from "./surface";


export class ProgressBar extends surface.Surface {
    static SurfaceClassName = "ProgressBar";
    private _pbmin = 0;
    private _pbmax = 100;
    private _pbval = 0;
    private _pbe: HTMLElement;

    constructor(disp: base.IDisplay, surface_id: number) {
        super(disp, surface_id);
        this._pbe = document.createElement("div");
        surface.addClassCSS(this._pbe, "ns");
        surface.addClassCSS(this._pbe, "value");
        this.e.appendChild(this._pbe);
        this.setPadding(this.getPadding().add(3, 3, 3, 3));
    }

    // The default range is 0 to 100.
    // This resets the current value to be the min.
    setRange(min: number, max: number): void {
        if (!isFinite(min))
            throw new RangeError("Invalid min value");
        if (!isFinite(max))
            throw new RangeError("Invalid max value");
        if (min >= max)
            throw new RangeError("Invalid range");
        this._pbmin = min;
        this._pbmax = max;
        this._pbval = min;
        this._pbcalc();
    }

    getMin() {
        return this._pbmin;
    }

    getMax() {
        return this._pbmax;
    }

    getValue(): number {
        return this._pbval;
    }

    setValue(value: number): void {
        if (!isFinite(value))
            throw new TypeError("Invalid value");
        if (value < this._pbmin)
            value = this._pbmin;
        if (value > this._pbmax)
            value = this._pbmax;
        this._pbval = value;
        this._pbcalc();
    }

    private _pct(): number {
        return (this._pbval - this._pbmin) / (this._pbmax - this._pbmin);
    }

    toString(): string {
        return "" + (this._pct() * 100 | 0) + "%"
    }

    setBounds(b: util.Bounds): void {
        super.setBounds(b);
        this._pbcalc();
    }

    setPadding(m: util.Padding): void {
        super.setPadding(m);
        this._pbcalc();
    }

    private _pbcalc(): void {
        let m = this.getPadding();
        let b = util.getClientBounds(this);
        surface.setCSS(this._pbe, "left", "" + m.left + "px");
        surface.setCSS(this._pbe, "top", "" + m.top + "px");
        surface.setCSS(this._pbe, "width", "" + Math.round(b.width * this._pct()) + "px");
        surface.setCSS(this._pbe, "height", "" + b.height + "px");
    }

}