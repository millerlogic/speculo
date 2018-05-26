// Copyright (C) 2018 Christopher E. Miller
//
// This Source Code Form is subject to the terms of the Mozilla Public
// License, v. 2.0. If a copy of the MPL was not distributed with this file,
// You can obtain one at https://mozilla.org/MPL/2.0/.

import * as base from "./base";
import * as surface from "./surface";


// Subject to same-origin policy, CORS restrictions.
// Refused to display 'SITE' in a frame because it set 'X-Frame-Options' to 'SAMEORIGIN'.
export class WebBrowser extends surface.Surface {
    static SurfaceClassName = "WebBrowser";
    private iframe: HTMLIFrameElement

    constructor(disp: base.IDisplay, surface_id: number) {
        super(disp, surface_id, document.createElement("div"));
        this.iframe = document.createElement("iframe");
        this.e.appendChild(this.iframe);
        this.eclient = this.iframe;
        this.style |= base.StyleFlags.Selectable;
        this.iframe.setAttribute("sandbox", "allow-forms allow-modals allow-orientation-lock allow-pointer-lock allow-popups allow-presentation allow-scripts allow-popups-to-escape-sandbox");
        this.iframe.style.pointerEvents = 'none';
    }

    navigate(url: string): void {
        this.iframe.src = url;
    }

    getURL(): string {
        return this.iframe.src;
    }

    onGotFocus(ev: FocusEvent): void {
        this.iframe.style.pointerEvents = '';
    }

    onLostFocus(ev: FocusEvent): void {
        this.iframe.style.pointerEvents = 'none';
    }

}