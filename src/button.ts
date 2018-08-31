// Copyright (C) 2018 Christopher E. Miller
//
// This Source Code Form is subject to the terms of the Mozilla Public
// License, v. 2.0. If a copy of the MPL was not distributed with this file,
// You can obtain one at https://mozilla.org/MPL/2.0/.

import * as base from "./base";
import * as util from "./util";
import * as surface from "./surface";


export class Button extends surface.Surface implements util.IAction {
    static SurfaceClassName = "Button";

    constructor(disp: base.IDisplay, surface_id: number) {
        super(disp, surface_id, document.createElement("button"));
        this.style |= base.StyleFlags.Selectable;
    }

    getText(): string {
        return this.e.innerText;
    }

    setText(text: string): void {
        this.e.innerText = text;
    }

    setDefault(x: boolean): void {
        if (x) {
            surface.addClassCSS(this.e, "default");
        } else {
            surface.removeClassCSS(this.e, "default");
        }
    }

    getDefault(): boolean {
        return this.e.matches(".default");
    }

    performAction(sender: any): void {
        //
    }

    onClick(ev: surface.SurfacePointerEvent): void {
        this.performAction(this);
    }

    isInputKey(key: base.IKey): boolean {
        if (key.keyCode == 13 || key.keyCode == 32)
            return true; // I want enter and space.
        return super.isInputKey(key);
    }

}