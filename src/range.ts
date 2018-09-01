// Copyright (C) 2018 Christopher E. Miller
//
// This Source Code Form is subject to the terms of the Mozilla Public
// License, v. 2.0. If a copy of the MPL was not distributed with this file,
// You can obtain one at https://mozilla.org/MPL/2.0/.

import * as base from "./base";
import * as surface from "./surface";


export class Range extends surface.Surface {
    static SurfaceClassName = "Range";

    constructor(disp: base.IDisplay, surface_id: number) {
        super(disp, surface_id, document.createElement("input"));
        this.e.setAttribute("type", "range");
        this.e.setAttribute("min", "0");
        this.e.setAttribute("max", "100");
        this.e.setAttribute("step", "1");
        (this.e as any).value = "0"
    }

    // The default range is 0 to 100.
    // This resets the current value to be the min.
    // Only whole numbers are used.
    setRange(min: number, max: number): void {
        if (!isFinite(min))
            throw new RangeError("Invalid min value");
        if (!isFinite(max))
            throw new RangeError("Invalid max value");
        min |= 0;
        max |= 0;
        if (min >= max)
            throw new RangeError("Invalid range");
        this.e.setAttribute("min", "" + min);
        this.e.setAttribute("min", "" + max);
        (this.e as any).value = "" + min;
    }

    getMin() {
        return parseInt(this.e.getAttribute("min") || "0", 10);
    }

    getMax() {
        return parseInt(this.e.getAttribute("max") || "100", 10);
    }

    getValue(): number {
        return parseInt((this.e as any).value || "0", 10);
    }

    // Only whole numbers are used.
    setValue(value: number): void {
        if (!isFinite(value))
            throw new TypeError("Invalid value");
        value |= 0;
        let min = this.getMin();
        if (value < min)
            value = min;
        let max = this.getMax();
        if (value > max)
            value = max;
        (this.e as any).value = "" + value;
    }

    toString(): string {
        return this.getValue().toString();
    }

    onUserInput(ev: Event): void { }

    create(): void {
        if (this.isCreated())
            return;
        super.create();
        this.e.addEventListener("input", (ev) => this.onUserInput(ev));
    }

}