// Copyright (C) 2018 Christopher E. Miller
//
// This Source Code Form is subject to the terms of the Mozilla Public
// License, v. 2.0. If a copy of the MPL was not distributed with this file,
// You can obtain one at https://mozilla.org/MPL/2.0/.

import * as util from "./util";


// The web/CSS apparently always uses 96.
const DPI = 96;


// emPx and remPx are optionally the base px size of 1em and 1rem.
// Returns NaN if empty string.
export function toPx(s: string, emPx?: number, remPx?: number): number {
    let sz = parseFloat(s);
    if (!sz) // 0 or NaN.
        return sz;
    let last2 = s.substring(s.length - 2);
    switch (last2) {
        case "pt":
            return sz * (DPI / 72);
        case "px":
            return sz;
        case "em":
            if (s.substring(s.length - 3, s.length - 2) == 'r') {
                if (remPx == undefined)
                    throw new TypeError("rem size not supported");
                return sz * remPx;
            } else {
                if (emPx == undefined)
                    throw new TypeError("em size not supported");
                return sz * emPx;
            }
    }
    throw new TypeError("Unknown CSS unit");
}


export class Font {
    constructor(readonly family: string,
        readonly size: number, // Size in px.
        readonly weight: number = 400,
        readonly style = "normal",
        readonly lineHeight = 1, // Multiple of size, or NaN.
        readonly variant = "normal") { }

    private static _from(styles: CSSStyleDeclaration): Font {
        let fspx = toPx(styles.fontSize || "0");
        return new Font(
            styles.fontFamily || "inherit",
            fspx,
            styles.fontWeight == "normal" ? 400 : styles.fontWeight == "bold" ? 700 :
                parseInt(styles.fontWeight || "400", 10),
            styles.fontStyle ? styles.fontStyle : "normal",
            /^[+-]?[\d\.]+$/.test(styles.lineHeight || "") ? parseFloat(styles.lineHeight || "0") :
                styles.lineHeight == "normal" ? 1 : (toPx(styles.lineHeight || "0", fspx) / fspx),
            styles.fontVariant ? styles.fontVariant : "normal"
        );
    }

    static fromElement(e: Element): Font {
        return Font._from(window.getComputedStyle(e));
    }

    static fromCSS(cssFont: string): Font {
        let e = document.createElement("div");
        e.style.lineHeight = "1em";
        e.style.font = cssFont;
        return Font._from(e.style);
    }

    private static _c(x: string): string {
        if (x.indexOf(" ") != -1 && x.indexOf("'") == -1) {
            return "'" + x + "'";
        }
        return x;
    }

    toCSS(): string {
        return Font._c(this.style) + " " + Font._c(this.variant) + " " + this.weight +
            " " + this.size + "px" + (isNaN(this.lineHeight) ? "" : ("/" + this.lineHeight)) +
            " " + Font._c(this.family);
    }

    toString(): string {
        return "font: " + this.toCSS();
    }
}


export class TextDecoration {
    constructor(readonly underline = false,
        readonly lineThrough = false, // strikethrough/strikeout
        readonly overline = false) {
    }

    private static _from(s: string): TextDecoration {
        let sa = (s || "").split(" ");
        let ul, lt, ol;
        for (let i = 0; i < sa.length; i++) {
            if (sa[i] == "underline")
                ul = true;
            if (sa[i] == "line-through")
                lt = true;
            if (sa[i] == "overline")
                ol = true;
        }
        if (ul || lt || ol)
            return new TextDecoration(ul, lt, ol);
        return TextDecoration.none;
    }

    static fromElement(e: Element): TextDecoration {
        return TextDecoration._from(window.getComputedStyle(e).textDecoration || "");
    }

    static fromCSS(cssTextDecoration: string): TextDecoration {
        return TextDecoration._from(cssTextDecoration);
    }

    toCSS(): string {
        let s = "";
        if (this.underline)
            s += (s ? " " : "") + "underline";
        if (this.lineThrough)
            s += (s ? " " : "") + "line-through";
        if (this.overline)
            s += (s ? " " : "") + "overline";
        return s || "none";
    }

    toString(): string {
        return "text-decoration: " + this.toCSS();
    }

    static readonly none = new TextDecoration();
}


let emt: HTMLCanvasElement | undefined;

// Does not interpret newline or tab chracters.
export function measureText(text: string, f: Font): util.Size {
    if (text == "")
        return new util.Size(0, 0);
    if (!emt)
        emt = document.createElement("canvas");
    let c = emt.getContext("2d");
    if (!c)
        throw new Error("2d ctx");
    c.font = f.toCSS();
    let tm = c.measureText(text);
    return new util.Size(tm.width, f.size * (isNaN(f.lineHeight) ? 1 : f.lineHeight));
}


// Represents a color as hex AARRGGBB.
// The alpha channel can be outside of the signed 32-bit integer range.
export type Color = number;

function _cn(n: number): number {
    return (n < 0 || n > 255 || n != (n | 0)) ? NaN : n;
}

export function newColor(red: number, green: number, blue: number, alpha: number = 255): Color {
    return (_cn(alpha) * 0x1000000) + (_cn(red) * 0x10000) + (_cn(green) * 0x100) + _cn(blue);
}

export function getRed(c: Color): number {
    return isNaN(c) ? NaN : ((c >> 16) & 0xFF);
}

export function getGreen(c: Color): number {
    return isNaN(c) ? NaN : ((c >> 8) & 0xFF);
}

export function getBlue(c: Color): number {
    return isNaN(c) ? NaN : (c & 0xFF);
}

export function getAlpha(c: Color): number {
    return isNaN(c) ? NaN : ((c >> 24) & 0xFF);
}

// Only supports hex #RRGGBB or #RRGGBBAA (not shorthand or rgb() or rgba())
// Returns NaN if invalid.
export function parseColor(s: string): Color {
    switch (s.length) {
        case 7:
            return parseInt(s.substring(1), 16) + 0xFF000000;
        case 9:
            return parseInt(s.substring(1, 7), 16) +
                (parseInt(s.substring(7), 16) * 0x1000000);
        default:
            return NaN;
    }
}

let _csscolorRE = /^ *(rgba?) *\( *(\d+) *, *(\d+) *, *(\d+) *,? *([\d\.]*) *\)/i;

// Parses "rgb"["a"](n,n,n[,a]) or #..., or returns NaN if invalid or unsupported.
// Where `n` is a decimal integer from 0-255 (percent not supported), and `a` is a value from 0 to 1.
// Does not support hsl or other unspecified formats or values.
export function parseColorCSS(s: string): Color {
    if (s.charAt(0) == '#')
        return parseColor(s);
    let m = s.match(_csscolorRE);
    if (m) {
        if (m[1].length >= 3) {
            return newColor(parseInt(m[2], 10), parseInt(m[3], 10), parseInt(m[4], 10));
        } else {
            let alpha = parseInt(m[5], 10) * 255;
            return newColor(parseInt(m[2], 10), parseInt(m[3], 10), parseInt(m[4], 10), alpha);
        }
    }
    return NaN;
}

function _c2x(n: number) {
    return (n <= 0xF) ? ("0" + n.toString(16)) : n.toString(16);
}

// Returns #RRGGBB, or #RRGGBBAA if alpha is not 255.
export function toColorString(c: Color): string {
    let s = "#" + _c2x(getRed(c)) + _c2x(getGreen(c)) + _c2x(getBlue(c));
    let a = getAlpha(c);
    if (a < 255)
        s += _c2x(a);
    return s;
}

