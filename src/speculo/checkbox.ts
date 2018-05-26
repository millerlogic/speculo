// Copyright (C) 2018 Christopher E. Miller
//
// This Source Code Form is subject to the terms of the Mozilla Public
// License, v. 2.0. If a copy of the MPL was not distributed with this file,
// You can obtain one at https://mozilla.org/MPL/2.0/.

import * as base from "./base";
import * as surface from "./surface";
import * as util from "./util";


export enum CheckState {
    Unchecked,
    Checked,
    Indeterminate
}


export interface ICheckable {
    getChecked(): boolean
    setChecked(x: boolean): void
}

function getchk(e: HTMLInputElement): CheckState {
    if (e.indeterminate)
        return CheckState.Indeterminate;
    if (e.checked)
        return CheckState.Checked;
    return CheckState.Unchecked;
}

function setchk(e: HTMLInputElement, cs: CheckState): void {
    if (cs == CheckState.Indeterminate) {
        e.indeterminate = true;
    } else if (cs == CheckState.Checked) {
        e.checked = true;
        e.indeterminate = false;
    } else {
        e.indeterminate = false;
        e.checked = false;
    }
}


class _CheckInput extends surface.Surface {
    protected input: HTMLInputElement
    private _el: HTMLLabelElement

    constructor(disp: base.IDisplay, surface_id: number, inputType: string) {
        super(disp, surface_id, document.createElement("div"));
        this.input = document.createElement("input");
        this.input.setAttribute("type", inputType);
        this.e.appendChild(this.input);
        this._el = document.createElement("label");
        this.e.appendChild(this._el);
        this.style |= base.StyleFlags.Selectable;
    }

    getChecked(): boolean {
        return getchk(this.input) == CheckState.Checked;
    }

    setChecked(x: boolean): void {
        if (x)
            setchk(this.input, CheckState.Checked);
        else
            setchk(this.input, CheckState.Unchecked);
    }

    getText(): string {
        return this._el.innerText;
    }

    setText(text: string): void {
        this._el.innerText = text;
    }

    setAlign(a: util.Align): void {
        var x = "";
        if (a == util.Align.End)
            x = "right";
        else if (a == util.Align.Center)
            x = "center";
        surface.setCSS(this.e, "text-align", x);
    }

    getAlign(): util.Align {
        let x = surface.getCSS(this.e, "text-align");
        if (x == "right")
            return util.Align.End;
        if (x == "center")
            return util.Align.Center
        return util.Align.Start;
    }

    setVAlign(a: util.Align): void {
        // TODO: need a span in the label, vertical-align will work on that.
        var x = "";
        if (a == util.Align.End)
            x = "bottom";
        else if (a == util.Align.Center)
            x = "middle";
        surface.setCSS(this.e, "vertical-align", x);
    }

    getVAlign(): util.Align {
        // TODO: FIX!
        let x = surface.getCSS(this.e, "vertical-align");
        if (x == "bottom")
            return util.Align.End;
        if (x == "middle")
            return util.Align.Center
        return util.Align.Start;
    }

    isInputKey(key: base.IKey): boolean {
        if (key.keyCode == 13 || key.keyCode == 32)
            return true; // I want enter and space.
        return super.isInputKey(key);
    }

    onUserInput(ev: Event): void { }

    protected setup(): void {
        super.setup();
        this.e.addEventListener("change", (ev) => this.onUserInput(ev));
    }

}


export class CheckBox extends _CheckInput implements ICheckable {
    static SurfaceClassName = "CheckBox";

    constructor(disp: base.IDisplay, surface_id: number) {
        super(disp, surface_id, "checkbox")
    }

    getCheckState(): CheckState {
        return getchk(this.input);
    }

    setCheckState(cs: CheckState): void {
        setchk(this.input, cs);
    }

    private _uchk(ev: UIEvent): void {
        this.input.checked = !this.input.checked;
        this.input.indeterminate = false;
        ev.preventDefault();
        this.onUserInput(ev);
    }

    onClick(ev: surface.SurfaceMouseEvent): void {
        if (ev.target !== this.input)
            this._uchk(ev);
    }

    onKeyDown(ev: KeyboardEvent): void {
        if (ev.keyCode == 32)
            this._uchk(ev);
    }

}


export class Toggle extends CheckBox implements ICheckable {
    static SurfaceClassName = "Toggle";
}


export class RadioButton extends _CheckInput implements ICheckable {
    static SurfaceClassName = "RadioButton";

    constructor(disp: base.IDisplay, surface_id: number) {
        super(disp, surface_id, "radio");
    }

    private _uchk(ev: UIEvent): void {
        if (!this.input.checked) {
            // Uncheck siblings:
            for (let sf = this.previousSibling(); sf; sf = sf.previousSibling()) {
                if (sf instanceof RadioButton)
                    sf.setChecked(false);
            }
            for (let sf = this.nextSibling(); sf; sf = sf.nextSibling()) {
                if (sf instanceof RadioButton)
                    sf.setChecked(false);
            }
            // Check this:
            this.input.checked = true;
            ev.preventDefault();
            this.onUserInput(ev);
        }
    }

    onClick(ev: surface.SurfaceMouseEvent): void {
        if (ev.target !== this.input)
            this._uchk(ev);
    }

    onKeyDown(ev: KeyboardEvent): void {
        if (ev.keyCode == 32)
            this._uchk(ev);
    }

}