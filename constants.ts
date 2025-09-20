
import { AspectRatio, LightingStyle, CameraPerspective } from './types';

export const ASPECT_RATIO_OPTIONS = Object.values(AspectRatio).map(value => ({ label: value, value }));
export const LIGHTING_STYLE_OPTIONS = Object.values(LightingStyle).map(value => ({ label: value, value }));
export const CAMERA_PERSPECTIVE_OPTIONS = Object.values(CameraPerspective).map(value => ({ label: value, value }));
