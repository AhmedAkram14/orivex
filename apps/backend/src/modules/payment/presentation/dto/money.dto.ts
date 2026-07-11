import { IsNumber, IsPositive, IsString, IsNotEmpty } from 'class-validator';

// Matches docs/12-openapi.md's Money schema exactly. Shared shape for both
// the initiateCharge request body and the PaymentTransaction response.
export class MoneyDto {
  @IsNumber()
  @IsPositive()
  amount!: number;

  @IsString()
  @IsNotEmpty()
  currency!: string;
}
