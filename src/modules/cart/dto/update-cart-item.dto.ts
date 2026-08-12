import { IsInt, IsNumber, Min } from 'class-validator';

export class UpdateCartItemDto {
  @IsInt()
  @Min(1)
  quantity!: number;
}