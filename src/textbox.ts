// Copyright (C) 2018 Christopher E. Miller
//
// This Source Code Form is subject to the terms of the Mozilla Public
// License, v. 2.0. If a copy of the MPL was not distributed with this file,
// You can obtain one at https://mozilla.org/MPL/2.0/.

import * as base from "./base";
import * as util from "./util";
import * as surface from "./surface";


class _Input extends surface.Surface {

    constructor(disp: base.IDisplay, surface_id: number, e?: HTMLElement) {
        super(disp, surface_id, e ? e : document.createElement("input"));
        this.style |= base.StyleFlags.Selectable | base.StyleFlags.AutoSelect;
    }

    getText(): string {
        return (this.eclient as any).value;
    }

    setText(text: string): void {
        let ml = this.getMaxLength();
        //if (ml != -1 && text.length > ml)
        //    text = text.substring(0, ml);
        (this.eclient as any).value = text;
    }

    // -1 if no limit.
    getMaxLength(): number {
        return (this.eclient as any).maxLength;
    }

    setMaxLength(n: number): void {
        if (n >= 0)
            (this.eclient as any).maxLength = n;
        else
            this.eclient.removeAttribute("maxLength");
    }

    getPlaceholder(): string {
        return this.eclient.getAttribute("placeholder") || "";
    }

    setPlaceholder(s: string): void {
        this.eclient.setAttribute("placeholder", s);
    }

    getReadonly(): boolean {
        return this.eclient.hasAttribute("readonly");
    }

    // Note: this may not work for some input types, such as color.
    setReadonly(x: boolean): void {
        if (x)
            this.eclient.setAttribute("readonly", "readonly");
        else
            this.eclient.removeAttribute("readonly");
    }

    isInputKey(key: base.IKey): boolean {
        if (key.keyCode == 37 || key.keyCode == 38 || key.keyCode == 39 || key.keyCode == 40)
            return true; // Arrows.
        return super.isInputKey(key);
    }

    onContextMenu(ev: surface.SurfacePointerEvent): void {
        // Allow.
    }

    onUserInput(ev: Event): void { }

    protected recreate(e: HTMLElement, eclient: HTMLElement): void {
        let maxlen = (this.eclient as any).maxLength;
        if (maxlen >= 0)
            (e as any).maxLength = maxlen;
        e.setAttribute("placeholder", this.eclient.getAttribute("placeholder") || "");
        if (this.getReadonly())
            e.setAttribute("readonly", "readonly");
        super.recreate(e, eclient);
    }

    create(): void {
        if (this.isCreated())
            return;
        super.create();
        this.eclient.setAttribute("autocomplete", "off");
        let gotinput = false;
        this.eclient.addEventListener("input", (ev) => {
            gotinput = true;
            this.onUserInput(ev);
        });
        this.eclient.addEventListener("change", (ev) => {
            if (!gotinput)
                this.onUserInput(ev);
        });
    }

}


export class TextBox extends _Input implements util.IScrollable {
    static SurfaceClassName = "TextBox";

    setMultiline(x: boolean) {
        if (x == this.getMultiline())
            return;
        var e = document.createElement(x ? "textarea" : "input");
        this.recreate(e, e);
    }

    getMultiline(): boolean {
        return this.matches("textarea");
    }

    protected recreate(e: HTMLElement, eclient: HTMLElement): void {
        if (!this.getWrap())
            e.setAttribute("wrap", "off");
        super.recreate(e, eclient);
    }

    create(): void {
        if (!this.isCreated()) {
            super.create();
            this.selectAll();
        }
    }

    selectAll(yes = true): void {
        if (yes) {
            this.setSelection(0, this.getEnd());
        } else {
            let x = this.getSelectionStart();
            this.setSelection(x, x);
        }
    }

    // The starting point of the selection.
    // For compatibility across various TextBox implementations,
    // selection point values should be treated as abstract values.
    // Can be compared for ordering; 0 is the start of the text box, getEnd() is the end.
    getSelectionStart(): number {
        return (this.eclient as any).selectionStart;
    }

    // The ending point of the selection; see getSelectionStart.
    getSelectionEnd(): number {
        return (this.eclient as any).selectionEnd;
    }

    // Set the selection; see getSelectionStart.
    setSelection(start: number, end = start): void {
        (this.eclient as any).selectionStart = start;
        (this.eclient as any).selectionEnd = end;
    }

    // Get the length of the whole text; also see getEnd()
    getTextLength(): number {
        return this.getText().length;
    }

    // Get the ending point of the whole text, can be used as a selection point.
    // The starting point of the whole text is always 0.
    getEnd(): number {
        return this.getTextLength();
    }

    getSelectedText(): string {
        return this.getText().substring(
            this.getSelectionStart(),
            this.getSelectionEnd())
    }

    setSelectedText(s: string): void {
        let start = this.getSelectionStart();
        let end = this.getSelectionEnd();
        let text = this.getText();
        let scrollX = this.eclient.scrollLeft;
        let scrollY = this.eclient.scrollTop;
        text = text.substring(0, start) + s + text.substring(end);
        this.setText(text);
        let newsel = start + s.length;
        this.setSelection(newsel, newsel);
        this.eclient.scrollLeft = scrollX;
        this.eclient.scrollTop = scrollY;
    }

    // Select end of input and insert text.
    appendText(s: string): void {
        let n = this.getEnd();
        this.setSelection(n, n);
        this.setSelectedText(s);
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

    getWrap(): boolean {
        return this.eclient.getAttribute("wrap") != "off";
    }

    setWrap(x: boolean): void {
        if (x)
            this.eclient.removeAttribute("wrap");
        else
            this.eclient.setAttribute("wrap", "off");
    }

    isInputKey(key: base.IKey): boolean {
        if (key.keyCode == 9)
            return this.getWantTab();
        if (key.keyCode == 13 && this.getMultiline()) {
            return key.ctrlKey || this.getWantReturn();
        }
        return super.isInputKey(key);
    }

    getWantReturn(): boolean {
        return this.eclient.matches(".want-return");
    }

    setWantReturn(x: boolean): void {
        if (x)
            surface.addClassCSS(this.eclient, "want-return");
        else
            surface.removeClassCSS(this.eclient, "want-return");
    }

    getWantTab(): boolean {
        return this.eclient.matches(".want-tab");
    }

    setWantTab(x: boolean): void {
        if (x)
            surface.addClassCSS(this.eclient, "want-tab");
        else
            surface.removeClassCSS(this.eclient, "want-tab");
    }

    onKeyDown(ev: KeyboardEvent): void {
        if (ev.keyCode == 9) {
            ev.preventDefault();
            this.setSelectedText("\t");
        }
    }

}


// Known input types: "color" | "date" | "datetime-local" | "email" | "file" | "month" |
//    "number" | "password" | "search" | "tel" | "time" | "url" | "week";

export class InputBox extends _Input {
    static SurfaceClassName = "InputBox";

    constructor(disp: base.IDisplay, surface_id: number, type: string) {
        let ph = type;
        switch (type) {
            case "button":
            case "checkbox":
            case "hidden":
            case "image":
            case "radio":
            case "range":
            case "reset":
            case "submit":
                type += "_";
        }
        super(disp, surface_id);
        this.eclient.setAttribute("placeholder", ph);
        this.eclient.setAttribute("type", type);
    }

    get input(): HTMLInputElement {
        return this.eclient as HTMLInputElement;
    }


}