// Copyright (C) 2018 Christopher E. Miller
//
// This Source Code Form is subject to the terms of the Mozilla Public
// License, v. 2.0. If a copy of the MPL was not distributed with this file,
// You can obtain one at https://mozilla.org/MPL/2.0/.

import * as base from "./base";
import * as util from "./util";
import * as surface from "./surface";


export class Scrollable extends surface.Surface implements util.IScrollable {
    static SurfaceClassName = "Scrollable";

    constructor(disp: base.IDisplay, surface_id: number, e?: HTMLElement) {
        super(disp, surface_id, e);
        let eclient = this.eclient === this.e ? document.createElement("div") : this.eclient;
        surface.addClassCSS(eclient, "ns");
        surface.addClassCSS(eclient, "client");
        this.e.appendChild(eclient);
        this.eclient = eclient;
    }

    getScrollable(): util.Scroll {
        let scroll = util.Scroll.None;
        if (this.eclient.matches(".hscroll"))
            scroll |= util.Scroll.Horizontal;
        if (this.eclient.matches(".vscroll"))
            scroll |= util.Scroll.Vertical;
        return scroll;
    }

    setScrollable(scroll: util.Scroll): void {
        if (scroll & util.Scroll.Horizontal)
            surface.addClassCSS(this.eclient, "hscroll");
        else
            surface.removeClassCSS(this.eclient, "hscroll");
        if (scroll & util.Scroll.Vertical)
            surface.addClassCSS(this.eclient, "vscroll");
        else
            surface.removeClassCSS(this.eclient, "vscroll");
    }

    /*
    getScrollSize(): util.Size {
        return this.getContentBounds(); // TODO: ...
    }

    // null resets it back to the default: to fit its children.
    setScrollSize(size: util.Size | null): void {
         // TODO: ...
    }
    */

}
