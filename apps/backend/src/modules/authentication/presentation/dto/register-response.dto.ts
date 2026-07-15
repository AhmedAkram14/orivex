export class RegisterResponseDto {
  status = 'verification_required' as const;
  email!: string;
}
