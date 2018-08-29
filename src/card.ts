// Copyright (C) 2018 Christopher E. Miller
//
// This Source Code Form is subject to the terms of the Mozilla Public
// License, v. 2.0. If a copy of the MPL was not distributed with this file,
// You can obtain one at https://mozilla.org/MPL/2.0/.

import * as base from "./base";
import * as util from "./util";
import * as panel from "./panel";


export class Card extends panel.Panel {
    static SurfaceClassName = "Card";

    constructor(disp: base.IDisplay, surface_id: number, e?: HTMLElement) {
        super(disp, surface_id, e);
        this.setBorderEnabled(true);
    }

    getBorderEnabled(): boolean {
        return this.e.matches(".card-border");
    }

    setBorderEnabled(yes: boolean): void {
        if (yes) {
            // Note: the card border is outside the client, but within the card itself.
            this.addClassCSS("card-border");
            //this.setPadding(util.Padding.fixed(4));
            this.setPadding(new util.Padding(3, 0, 3, 5));
        }
        else {
            this.removeClassCSS("card-border");
            this.setPadding(util.Padding.zero);
        }
    }

}
