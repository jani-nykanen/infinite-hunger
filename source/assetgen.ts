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
    0b111110101, // C Brightest orange (or something close enough)

    0b111111101, // D Bright yellow

    0b011001000, // E Dark red
    0b101011000, // F Brown
    0b111101010, // G Yellowish thing

    0b000010000, // H Dark green
    0b010001000, // I Dark brown

    0b110100111, // J Bright purple

    0b101001000, // K Red
    0b111011000, // L Orange

    0b011101110, // M Blue
    0b110111111, // N Very bright blue

    0b110100000, // O Brownish thing
    0b111110011, // P Orange-ish yellow

    0b001011100, // Q Darker blue

    0b100010101, // R Dark purple
    0b111110111, // S Bright pink

    0b111110010, // T Normal yellow

];


const GAME_ART_PALETTE_TABLE : (string | undefined) [] = [

    "1056", "1056", "1056", "1056", "EABC", "EABC", "EABC", "EABC",
    "1089", "1089", "1089", "1089", "EABC", "EABC", "EABC", "EABC",
    "H056", "H056", "H067", "H067", "H067", "H065", "E08D", "E08D",
    "H056", "H056", "H067", "H067", "H067", "H065", "H056", "H056",
    "H056", "H056", "30B2", "30B2", "10FG", "I0FG", "I0FG", "000J",
    "1042", "3042", "H056", "H056", "10FG", "I0FG", "I0FG", "000J",
    "100J", "100J", "100J", "100J", "100J", "100J", "100J", "100J",
    "100J", "100J", "100J", "100J", "100J", "100J", "100J", "100J",
    "10KL", "10KL", "10PD", "10PO", "10MN", "10MQ", "10MN", "10MQ",
    "10Q2", "10KL", "10PO", "10PO", "10MN", "10MQ", "10MN", "10MQ",
    "1004", "10JS", "10JR", "1042", "1042", "10LD", "10LK", "1042",
    "1004", "10JR", "10JR", "1042", "1042", "10LK", "10LK", "10KL",
    "10GD", "10GF", "10GF", "10GF", "10MN", "100D", "100D", "100D",
    "10GF", "10GF", "10GF", "10GF", "10MN", "100D", "100D", "100D",
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

    const canvas : RenderTarget = new RenderTarget(256, 32, false);

    // Adding missing colors
    canvas.setColor("#492400");
    canvas.fillRect(211, 7, 27, 4);

    canvas.setColor("#ffff6d");
    canvas.fillRect(2, 1, 28, 2);
    canvas.fillRect(1, 2, 1, 6);

    canvas.setColor("#ffdb92");
    canvas.fillRect(2, 3, 28, 5);
    canvas.fillRect(150, 4, 4, 4);
    canvas.fillRect(176, 4, 16, 5);

    canvas.setColor("#db9249");
    canvas.fillRect(4, 8, 24, 6);

    canvas.setColor("#924900");
    canvas.fillRect(192, 8, 16, 2);
    canvas.fillRect(212, 8, 25, 2);

    // Terrain & floor
    canvas.drawBitmap(bmpBase, Flip.None, 0, 0, 0, 0, 64, 16);
    // Vine & bush
    canvas.drawBitmap(bmpBase, Flip.None, 64, 0, 0, 16, 48, 24);

    // Palmtree leaves
    canvas.drawBitmap(bmpBase, Flip.None, 112, 0, 48, 24, 16, 8);
    canvas.drawBitmap(bmpBase, Flip.Horizontal, 128, 0, 48, 24, 16, 8);
    // ...and trunk
    canvas.setColor("#ffdb6d");
    canvas.fillRect(126, 8, 4, 24);
    for (let i : number = 0; i < 2; ++ i) {

        canvas.drawBitmap(bmpBase, Flip.None, 124, (i + 1)*8, 48, 16, 8, 8);

        // Also bridge
        canvas.drawBitmap(bmpBase, Flip.None, 176 + i*8, 0, 32, 32, 8, 16);
        // ...and fence parts
        canvas.drawBitmap(bmpBase, Flip.None, 192 + i*12, 0, 41, 32, 4, 16);
        canvas.drawBitmap(bmpBase, Flip.None, 220 + i*4, 0, 41, 32, 4, 16);

        // Spikes
        for (let j : number = 0; j < 2; ++ j) {

            canvas.drawBitmap(bmpBase, Flip.None, 240 + i*8, j*16 + 8, 56, 80 + j*8, 8, 8);
        }
    }
    canvas.drawBitmap(bmpBase, Flip.None, 124, 24, 56, 16, 8, 8);

    // Flower
    canvas.drawBitmap(bmpBase, Flip.None, 144, 3, 16, 32, 16, 16);
    // Rock
    canvas.drawBitmap(bmpBase, Flip.None, 164, 8, 8, 40, 8, 8);

    // Fence
    for (let i : number = 0; i < 3; ++ i) {
    
        canvas.drawBitmap(bmpBase, Flip.None, 192 + 4 + i*16, 0, 44, 32, 9, 16);
    }

    assets.addBitmap(BitmapIndex.Terrain, canvas.toBitmap());
}


const generateGameObjectsBitmap = (assets : Assets, bmpBase : Bitmap) : void => {

    const DEATH_COLORS : string[][] = [
        ["#ffb452", "#fffebb"],
        ["#b6b6b6", "#ffffff"]
    ];

    const FACE_OFFSET : number[] = [0, 2, 0, -2];

    const canvas : RenderTarget = new RenderTarget(256, 128, false);

    // Player
    for (let i : number = 0; i < 6; ++ i) {

        // Upper body
        canvas.drawBitmap(bmpBase, Flip.None, i*16, 0, 0, 48, 16, (i == 0 || i == 2) ? 16 : 8);
        if (i >= 4) {

            continue;
        }

        // Rotating
        canvas.drawBitmap(bmpBase, Flip.None, 96 + i*16, 0, 48, 48, 16, 16, 16, 16, 8, 8, -Math.PI/2*i);
        if (i >= 2) {

            continue;
        }

        // Upper body
        canvas.drawBitmap(bmpBase, Flip.None, 16 + i*32, 0, 0, 48, 16, 8);
        // Legs
        canvas.drawBitmap(bmpBase, Flip.None, 16 + i*32, 8, 16, 48 + i*8, 16, 8);
        // Jumping
        canvas.drawBitmap(bmpBase, Flip.None, 64 + i*16, 8, 32, 48 + i*8, 16, 8);
    }
    
    //
    // Enemies
    //

    // Spikeball body
    canvas.drawBitmap(bmpBase, Flip.None, 128 + 8, 24, 40, 80, 16, 16);
    // Spikeball face
    canvas.drawBitmap(bmpBase, Flip.None, 128 + 12, 28, 0, 72, 8, 8);
    // Spikeball chain
    canvas.drawBitmap(bmpBase, Flip.None, 160, 16, 0, 40, 8, 8);


    for (let i : number = 0; i < 4; ++ i) {
        
        if (i < 2) {

            // Left wing
            canvas.drawBitmap(bmpBase, Flip.None, i*16, 16, 32 + i*4, 96, 4, 16);
            // Right wing
            canvas.drawBitmap(bmpBase, Flip.Horizontal, i*16 + 12, 16, 32 + i*4, 96, 4, 16);
            // Bee body
            canvas.drawBitmap(bmpBase, Flip.None, i*16, 16, 16, 64, 16, 16);
            // Bee face
            canvas.drawBitmap(bmpBase, Flip.None, i*16 + 4, 16 + 1, 0, 72, 8, 8);

            // Slime base body
            canvas.drawBitmap(bmpBase, Flip.None, 32 + i*32, 16, 32, 64, 16, 16);
            // Slime top body
            canvas.drawBitmap(bmpBase, Flip.None, 48 + i*32, 16 + (i == 0 ? 2 : -1), 32, 64, 16, i == 0 ? 7 : 9);
            // Slime lower body
            canvas.drawBitmap(bmpBase, Flip.None, 48 + i*32, 24, 48, 64 + i*8, 16, 8);

            // Background tire
            canvas.drawBitmap(bmpBase, Flip.None, 96 + i*16, 32 - 5, 0, 90, 5, 5);
            // "Car" body
            canvas.drawBitmap(bmpBase, Flip.None, 96 + i*16, 16 - i, 8, 80, 16, 16);
            // Car face
            canvas.drawBitmap(bmpBase, Flip.None, 96 + 2 + i*16, 16 + 5 - i, 2, 72, 6, 8);

            // Coin
            canvas.drawBitmap(bmpBase, Flip.None, i*36, 32, i*24, 96, 16 - i*8, 16);
            canvas.drawBitmap(bmpBase, i as Flip, 20 + i*32, 32, 16, 96, 8, 16);
        }

        for (let j : number = 0; j < 2; ++ j) {

            // Slime eyes & nose
            canvas.drawBitmap(bmpBase, Flip.None, 32 + 4 + i*16, 16 + 6 + FACE_OFFSET[i], j*8, 72, 8, 8);

            if (i < 2) {

                // "Car" tires
                canvas.drawBitmap(bmpBase, Flip.None, 96 + 4 + i*16 + j*7, 32 - 5, 0, 80 + i*5, 5, 5);
            }
        }

        // Spikeball spikes
        canvas.drawBitmap(bmpBase, Flip.None, 128 + 11, 16 + 11, 24, 80, 16, 16, 16, 16, 5, 5, -Math.PI/2*i);
    }


    // Death animations
    for (let j : number = 0; j < 2; ++ j) {

        const color1 : string = DEATH_COLORS[j][0];
        const color2 : string = DEATH_COLORS[j][1];

        for (let i : number = 0; i < 4; ++ i) {

            const dx : number = i*32 + 16;
            const dy : number = 48 + 16 + j*32;

            if (i < 2) {

                const r : number = 8 + i*4;

                canvas.setColor(color1);
                canvas.fillEllipse(dx, dy, r);

                canvas.setColor(color2);
                canvas.fillEllipse(dx - 1, dy - 1, r - 2);
                continue;
            }

            canvas.setColor(color1);
            canvas.fillRing(dx, dy, 5 + (i - 2)*4, 12);
        
            canvas.setColor(color2);
            canvas.fillRing(dx - 1, dy - 1, 6 + (i - 2)*2, 10);
        }
    }

    assets.addBitmap(BitmapIndex.GameObjects, canvas.toBitmap());
}


const generateBackground = (assets : Assets) : void => {

    const FOREST_PERIOD : number = 16;
    const FOREST_SHIFT : number = 64;

    const canvas : RenderTarget = new RenderTarget(256, 160, false);

    // Moon
    canvas.setColor("#dbffff");
    canvas.fillEllipse(40, 120, 38, 38);
    canvas.setColor("#92dbff");
    canvas.fillEllipse(40 - 18, 120 - 18, 32, 32);

    // Forest
    canvas.setColor("#4992b6");
    for (let x : number = 0; x < 256; ++ x) {

        const v : number = x + FOREST_SHIFT;
        const t : number = ((v % FOREST_PERIOD) - FOREST_PERIOD/2)/(FOREST_PERIOD/2 + 2);
        const s : number = v/128*Math.PI*2;
        const dy = 1 + (1.0 - Math.sqrt(1.0 - t*t) + (1.0 + Math.sin(s)))*12;

        canvas.fillRect(x, dy, 1, 80 - dy + 1);
    }

    assets.addBitmap(BitmapIndex.Background, canvas.toBitmap());
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

                for (let j : number = -1; j <= 1; ++ j) {

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
        (new Array<(string | undefined)>(16*4)).fill("000T"), 
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
    assets.addBitmap(BitmapIndex.FontOutlinesYellow, 
        generateOutlinedFont(bmpFontBlack, bmpFontYellow));

    // Close enough to a font
    assets.addBitmap(BitmapIndex.GameOver,
        createBigText(
        "GAME\nOVER!", "bold 32px Arial", 128, 64, 28, 4, [
            [255, 146, 0],
            [182, 36, 0]
        ])
    );
}


const generateLogo = (assets : Assets) : void => {

    const upperBitmap : Bitmap = createBigText(
        "INFINITE", "bold 28px Arial", 128, 32, 24, 4, [
            [255, 146, 0],
            [182, 36, 0]
        ]);
    const lowerBitmap : Bitmap = createBigText(
        "HUNGER", "bold 40px Arial", 256, 64, 48, 6, [
            [255, 146, 0],
            [182, 36, 0]
        ], 1);

    const canvas : RenderTarget = new RenderTarget(256, 72, false);

    canvas.drawBitmap(upperBitmap, Flip.None, 64, 0);
    canvas.drawBitmap(lowerBitmap, Flip.None, 0, 12);

    assets.addBitmap(BitmapIndex.Logo, canvas.toBitmap());
}


const generateSamples = (assets : Assets, audio : AudioPlayer) : void => {

    assets.addSample(SampleIndex.Coin, 
        audio.createSample(
            [160, 4, 0.60,
            100, 2, 0.80,
            256, 10, 1.00],
            0.60,
            OscType.Square, 
            Ramp.Instant)
        );

    assets.addSample(SampleIndex.Jump, 
        audio.createSample(
            [96,  4, 0.50,
            112, 3, 0.80,
            160, 4, 0.60,
            224, 5, 0.20], 
            0.80,
            OscType.Sawtooth, 
            Ramp.Exponential)
        );

    assets.addSample(SampleIndex.Stomp,
        audio.createSample(
            [112, 3, 0.70,
            80, 4, 1.0,
            96, 8, 0.50],
            0.80,
            OscType.Sawtooth, 
            Ramp.Exponential)
        );

    assets.addSample(SampleIndex.Hurt,
        audio.createSample(
            [128, 3, 0.80,
            96, 4, 1.0,
            80, 8, 0.50],
            0.70,
            OscType.Square, 
            Ramp.Exponential)
        );

    assets.addSample(SampleIndex.Tongue,
        audio.createSample(
            [144, 2, 0.80,
             112, 2, 1.0,
             144, 2, 1.0,
             128, 4, 0.5
            ],
            0.70,
            OscType.Sawtooth, 
            Ramp.Exponential)
        );

    assets.addSample(SampleIndex.Eat,
        audio.createSample(
            [112, 3, 0.80,
            80, 4, 1.0,
            96, 8, 0.50],
            0.60,
            OscType.Square, 
            Ramp.Exponential)
        );

    assets.addSample(SampleIndex.GetStuck,
        audio.createSample(
            [160, 2, 1.0,
            96, 4, 0.50 ],
            0.60,
            OscType.Square, 
            Ramp.Exponential)
        );

    assets.addSample(SampleIndex.Start,
        audio.createSample( 
            [120, 8, 1.0,
            88, 4, 0.30], 
            0.40,
            OscType.Square, 
            Ramp.Instant)
    );

    for (let i : number = 0; i < 2; ++ i) {

        assets.addSample(
            (SampleIndex.Ready + i) as SampleIndex,
                audio.createSample( 
                    [112 + i*32, 16, 1.0,
                    88 + i*8, 2, 0.30], 
                    0.40,
                    OscType.Square, 
                    Ramp.Instant)
            );
    }
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
    generateLogo(assets);

    // Sounds
    generateSamples(assets, audio);
}
