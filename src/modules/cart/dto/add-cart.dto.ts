import { IsInt, IsString, Min } from "class-validator";


export class AddCartDto {

  @IsString()
  productId!: string;

  @IsInt()
  @Min(1)
  quantity!: number;
}