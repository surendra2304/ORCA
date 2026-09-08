import { IsEmail, IsString, IsNotEmpty, IsOptional, IsUrl } from 'class-validator';

export class ContactSubmissionDto {
  @IsString()
  @IsNotEmpty()
  name: string;

  @IsEmail()
  email: string;

  @IsOptional()
  @IsString()
  websiteUrl?: string;

  @IsString()
  @IsNotEmpty()
  message: string;
}
