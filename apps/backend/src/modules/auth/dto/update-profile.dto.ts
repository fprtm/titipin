import { updateProfileSchema } from '@titipin/shared';

export class UpdateProfileDto {
  static readonly schema = updateProfileSchema;
  name!: string;
}
