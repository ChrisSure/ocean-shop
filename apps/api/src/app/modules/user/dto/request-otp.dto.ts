import { IsEmail, IsOptional, IsString, ValidateIf } from 'class-validator';

export class RequestOtpDto {
  @IsOptional()
  @IsEmail()
  readonly email?: string;

  @ValidateIf((o) => !o.email)
  @IsString()
  readonly phone?: string;
}
