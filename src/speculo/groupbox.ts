// Copyright (C) 2018 Christopher E. Miller
//
// This Source Code Form is subject to the terms of the Mozilla Public
// License, v. 2.0. If a copy of the MPL was not distributed with this file,
// You can obtain one at https://mozilla.org/MPL/2.0/.

import * as base from "./base";
import * as util from "./util";
import * as surface from "./surface";
import * as panel from "./panel";


export class GroupBox extends panel.Panel {
    static SurfaceClassName = "GroupBox";
    private legend: HTMLElement

    constructor(disp: base.IDisplay, surface_id: number) {
        super(disp, surface_id, document.createElement("fieldset"));
        this.legend = document.createElement("legend");
        this.e.insertBefore(this.legend, this.eclient);
        this.setBorderEnabled(true);
    }

    getText(): string {
        return this.legend.innerText;
    }

    setText(text: string): void {
        let not = !this.legend.innerText;
        this.legend.innerText = text;
        if (not != !text) {
            setTimeout(() => { // Wait until the styles apply...
                // TODO: update this when the font changes.
                // TODO: need to preserve these values so we can undo them properly,
                // in case the values change later and we undo the wrong values.
                let legendHeight = Math.ceil(parseFloat(surface.getAllCSS(this.legend).height || "0"));
                // Does not consider if the text wraps...
                if (text) {
                    this.legend.style.display = "";
                    this.setPadding(this.getPadding().add(0, legendHeight, 0, 0));
                } else {
                    this.legend.style.display = "none";
                    this.setPadding(this.getPadding().add(0, -legendHeight, 0, 0));
                }
            });
        }
    }

    getBorderEnabled(): boolean {
        return this.e.matches(".group-border");
    }

    setBorderEnabled(yes: boolean): void {
        if (this.getBorderEnabled() != !yes)
            return;
        if (yes) {
            this.addClassCSS("group-border");
            this.setPadding(this.getPadding().add(2, 2, 2, 2));
        }
        else {
            this.removeClassCSS("group-border");
            this.setPadding(this.getPadding().add(-2, -2, -2, -2));
        }
    }

}