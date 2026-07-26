import { IsNotEmpty, IsString, Length, MaxLength } from 'class-validator';

export class CreateCountryRequestDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(200)
  name!: string;

  @IsString()
  @Length(2, 2)
  iso2Code!: string;
}
