// Copyright (C) 2018 Christopher E. Miller
//
// This Source Code Form is subject to the terms of the Mozilla Public
// License, v. 2.0. If a copy of the MPL was not distributed with this file,
// You can obtain one at https://mozilla.org/MPL/2.0/.

import * as base from "./base";
import * as surface from "./surface";


export class Canvas extends surface.Surface {
    static SurfaceClassName = "Canvas";

    constructor(disp: base.IDisplay, surface_id: number) {
        super(disp, surface_id, document.createElement("canvas"));
    }

    getContext(contextId: "2d", contextAttributes?: Canvas2DContextAttributes): CanvasRenderingContext2D | null
    getContext(contextId: "webgl" | "experimental-webgl", contextAttributes?: WebGLContextAttributes): WebGLRenderingContext | null
    getContext(contextId: string, contextAttributes?: {}): CanvasRenderingContext2D | WebGLRenderingContext | null {
        return (this.e as HTMLCanvasElement).getContext(contextId, contextAttributes)
    }

    toDataURL(type?: string, encoderOptions?: number): string {
        return (this.e as HTMLCanvasElement).toDataURL(type, encoderOptions);
    }

    toBlob(callback: (result: Blob | null) => void, type?: string, qualityArgument?: number): void {
        return (this.e as HTMLCanvasElement).toBlob(callback, type, qualityArgument);
    }

}