import { SetMetadata } from '@nestjs/common';

export const BYPASS_TRANSFORM_KEY = 'BYPASS_TRANSFORM';
export const BypassTransform = () => SetMetadata(BYPASS_TRANSFORM_KEY, true);
