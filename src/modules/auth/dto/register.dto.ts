import { IsEmail, IsString, MinLength } from 'class-validator';

export class RegisterDto {

  @IsString()
  name!: string;


  @IsEmail()
  email!: string;


  @MinLength(6, {
    message: 'A senha precisa ter pelo menos 6 caracteres',
  })
  password!: string;

}