// Copyright (C) 2018 Christopher E. Miller
//
// This Source Code Form is subject to the terms of the Mozilla Public
// License, v. 2.0. If a copy of the MPL was not distributed with this file,
// You can obtain one at https://mozilla.org/MPL/2.0/.

import * as base from "./base";
import * as util from "./util";
import * as surface from "./surface";


export class Panel extends surface.Surface {
    static SurfaceClassName = "Panel";

    constructor(disp: base.IDisplay, surface_id: number, e?: HTMLElement) {
        super(disp, surface_id, e);
        this.style |= base.StyleFlags.Container;
        let eclient = this.eclient === this.e ? document.createElement("div") : this.eclient;
        surface.addClassCSS(eclient, "ns");
        surface.addClassCSS(eclient, "client");
        this.e.appendChild(eclient);
        this.eclient = eclient;
    }

    getBorderEnabled(): boolean {
        return this.e.matches(".panel-border");
    }

    setBorderEnabled(yes: boolean): void {
        if (yes) {
            this.addClassCSS("panel-border");
            this.setPadding(util.Padding.fixed(1));
        }
        else {
            this.removeClassCSS("panel-border");
            this.setPadding(util.Padding.zero);
        }
    }

}
