
export enum AspectRatio {
    SQUARE = '1:1',
    PORTRAIT = '3:4',
    LANDSCAPE = '16:9',
}

export enum LightingStyle {
    STUDIO = 'Studio Lighting',
    NATURAL = 'Natural Light',
    CINEMATIC = 'Cinematic',
    DRAMATIC = 'Dramatic',
    SOFT = 'Soft Glow',
    HIGH_KEY = 'High-Key',
}

export enum CameraPerspective {
    EYE_LEVEL = 'Eye-level',
    HIGH_ANGLE = 'High-angle',
    LOW_ANGLE = 'Low-angle',
    CLOSE_UP = 'Close-up',
    WIDE_SHOT = 'Wide shot',
    DUTCH_ANGLE = 'Dutch Angle',
}

export interface StyleSettings {
    aspectRatio: AspectRatio;
    lightingStyle: LightingStyle;
    cameraPerspective: CameraPerspective;
}
