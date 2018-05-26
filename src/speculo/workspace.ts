// Copyright (C) 2018 Christopher E. Miller
//
// This Source Code Form is subject to the terms of the Mozilla Public
// License, v. 2.0. If a copy of the MPL was not distributed with this file,
// You can obtain one at https://mozilla.org/MPL/2.0/.

import * as base from "./base";
import * as surface from "./surface";
import * as scrollable from "./scrollable";
import * as util from "./util";


interface Cc { // Container child.
    onContainerResized(area: util.Bounds): void // Inner area.
}


export class Workspace extends scrollable.Scrollable {
    static SurfaceClassName = "Workspace";

    constructor(disp: base.IDisplay, surface_id: number, e?: HTMLElement) {
        super(disp, surface_id, e);
        this.style |= base.StyleFlags.Container;
    }

    private _resz() {
        let area = util.getClientBounds(this);
        for (let c = this.firstChild(); c; c = c.nextSibling()) {
            let cc = c as any as Cc;
            if (cc.onContainerResized)
                cc.onContainerResized(area);
        }
    }

    create(): void {
        if (!this.isCreated()) {
            super.create();
            this._resz();
        }
    }

    setBounds(b: util.Bounds): void {
        super.setBounds(b);
        this._resz();
    }

    setPadding(m: util.Padding): void {
        super.setPadding(m);
        this._resz();
    }

}