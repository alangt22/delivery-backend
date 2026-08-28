import { IsInt, IsString, Min } from "class-validator";
import { ApiProperty } from '@nestjs/swagger';


export class AddCartDto {

  @ApiProperty()
  @IsString()
  productId!: string;

  @ApiProperty()
  @IsInt()
  @Min(1)
  quantity!: number;
}
