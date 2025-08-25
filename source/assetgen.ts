import { Assets } from "./assets.js"
import { AudioPlayer } from "./audioplayer.js";
import { OscType, Ramp } from "./audiosample.js";
import { applyPalette, createBigText } from "./bitmapgen.js";
import { Bitmap, Flip, RenderTarget } from "./gfx.js"
import { BitmapIndex, SampleIndex } from "./mnemonics.js"
import { ProgramComponents } from "./program.js";


type PaletteLookup = [number, number, number, number][];


const enum Note {

    C2 = 65.41,
    D2 = 73.42,
    E2 = 82.41,
    F2 = 87.31,
    G2 = 98.0,
    A2 = 110.0,
    B2 = 123.7,
    C3 = 130.81,
    D3 = 146.83,
    E3 = 164.81,
    F3 = 174.61,
    G3 = 196.0,
    A3 = 220.0,
    B3 = 246.94,
    C4 = 261.63,
    D4 = 293.66,
    E4 = 329.63,
    F4 = 349.23,
    G4 = 392.0,
    A4 = 440.0,
    B4 = 493.88,
}


const TRANSPARENT_COLOR : number = 0b100;
const PALETTE_TABLE : number[] = [

    0b100, // 0 Transparent

    0, // 1 Black
    511, // 2 White
    0b011011011, // 3 Dark gray
    0b101101101, // 4 Bright gray

    0b010100000, // 5 Dark green
    0b100110000, // 6 Green
    0b110111000, // 7 Bright green

    0b110100010, // 8 Darker beige
    0b111110100, // 9 Beige

    0b101010000, // A Orange-ish brown
    0b111100010, // B Brighter orange
    0b111110101, // C Brightest orange
];


const GAME_ART_PALETTE_TABLE : (string | undefined) [] = [

    "1056", "1056", "1056", "1056", "1ABC", "1ABC", "1ABC", "1ABC",
    "1089", "1089", "1089", "1089", "1ABC", "1ABC", "1ABC", "1ABC",
];


const generatePaletteLookup = () : PaletteLookup => {

    const MULTIPLIER : number = 255.0/7.0;

    const out : number[][] = new Array<number[]> ();

    for (let i : number = 0; i < 512; ++ i) {

        const r : number = (i >> 6) & 7;
        const g : number = (i >> 3) & 7;
        const b : number = i & 7;

        out[i] = [
            (r*MULTIPLIER) | 0, 
            (g*MULTIPLIER) | 0, 
            (b*MULTIPLIER) | 0,
            i == TRANSPARENT_COLOR ? 0 : 255];
    }
    
    return out as PaletteLookup;
}


const generateTerrainBitmap = (assets : Assets, bmpBase : Bitmap) : void => {

    const canvas : RenderTarget = new RenderTarget(128, 16, false);

    canvas.setColor("#dbff00");
    canvas.fillRect(2, 1, 28, 2);
    canvas.fillRect(1, 2, 1, 6);

    canvas.setColor("#ffdb92");
    canvas.fillRect(2, 3, 28, 5);

    canvas.setColor("#db9249");
    canvas.fillRect(4, 8, 24, 6);


    canvas.drawBitmap(bmpBase);

    assets.addBitmap(BitmapIndex.Terrain, canvas.toBitmap());
}


const generateGameObjectsBitmap = (assets : Assets, bmpBase : Bitmap) : void => {

    // ...
}


const generateBackground = (assets : Assets) : void => {

    // ...
}


const generateOutlinedFont = (fontBlack : Bitmap, fontColored : Bitmap) : Bitmap => {

    const canvas : RenderTarget = new RenderTarget(fontColored.width*2, fontColored.height*2);

    const h : number = (fontColored.height/8) | 0;

    // Nested loops let's GOOOOOOO!
    for (let y : number = 0; y < h; ++ y) {

        const dy : number = y*16 + 4;

        for (let x : number = 0; x < 16; ++ x) {

            const dx : number = x*16 + 4;

            for (let i : number = -1; i <= 1; ++ i) {

                for (let j : number = -1; j <= 2; ++ j) {

                    if (i == 0 && j == 0) {

                        continue;
                    }
                    canvas.drawBitmap(fontBlack, Flip.None, dx + i, dy + j, x*8, y*8, 8, 8);
                }
                canvas.drawBitmap(fontColored, Flip.None, dx, dy, x*8, y*8, 8, 8);
            }
        }
    }

    return canvas.toBitmap();
}


const generateFonts = (assets : Assets, rgb333 : PaletteLookup) : void => {

    const bmpFontRaw : Bitmap = assets.getBitmap(BitmapIndex.FontRaw)!;

    // Single-colored fonts
    const bmpFontWhite : Bitmap = applyPalette(bmpFontRaw, 
        (new Array<(string | undefined)>(16*4)).fill("0002"), 
        PALETTE_TABLE, rgb333);
    const bmpFontYellow : Bitmap = applyPalette(bmpFontRaw, 
        (new Array<(string | undefined)>(16*4)).fill("000M"), 
        PALETTE_TABLE, rgb333);
    const bmpFontBlack : Bitmap = applyPalette(bmpFontRaw, 
        (new Array<(string | undefined)>(16*4)).fill("0001"), 
        PALETTE_TABLE, rgb333);
        
    assets.addBitmap(BitmapIndex.FontRaw, bmpFontRaw);

    assets.addBitmap(BitmapIndex.FontWhite, bmpFontWhite);
    assets.addBitmap(BitmapIndex.FontYellow, bmpFontYellow);

    // Outlined fonts
    assets.addBitmap(BitmapIndex.FontOutlinesWhite, 
        generateOutlinedFont(bmpFontBlack, bmpFontWhite));
}


const generateSamples = (assets : Assets, audio : AudioPlayer) : void => {

    // ...
}


export const generateAssets = (components : ProgramComponents) : void => {

    const rgb333 : PaletteLookup = generatePaletteLookup();

    const assets : Assets = components.assets;
    const audio : AudioPlayer = components.audio;

    // Fonts
    generateFonts(assets, rgb333);

    // Game art
    const bmpGameArtRaw : Bitmap = assets.getBitmap(BitmapIndex.BaseRaw)!;
    const bmpGameArt : Bitmap = applyPalette(bmpGameArtRaw, GAME_ART_PALETTE_TABLE, PALETTE_TABLE, rgb333);
    assets.addBitmap(BitmapIndex.Base, bmpGameArt);

    // Other bitmaps
    generateTerrainBitmap(assets, bmpGameArt);
    generateGameObjectsBitmap(assets, bmpGameArt);
    generateBackground(assets);

    // Sounds
    generateSamples(assets, audio);
}
