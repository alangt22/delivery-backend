import { IsEmail, IsString, MinLength } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class RegisterDto {

  @ApiProperty()
  @IsString()
  name!: string;


  @ApiProperty()
  @IsEmail()
  email!: string;


  @ApiProperty()
  @MinLength(6, {
    message: 'A senha precisa ter pelo menos 6 caracteres',
  })
  password!: string;

}
