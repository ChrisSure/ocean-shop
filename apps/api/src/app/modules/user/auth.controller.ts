import { Controller, Post, Body, Res, Req, Headers, Ip } from '@nestjs/common';
import { Response, Request } from 'express';
import { AuthService } from './auth.service';
import { RequestOtpDto } from './dto/request-otp.dto';
import { VerifyOtpDto } from './dto/verify-otp.dto';

@Controller('user/auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('request-otp')
  async requestOtp(@Body() requestOtpDto: RequestOtpDto) {
    return await this.authService.requestOtp(requestOtpDto);
  }

  @Post('verify-otp')
  async verifyOtp(
    @Body() verifyOtpDto: VerifyOtpDto,
    @Headers('user-agent') userAgent: string,
    @Ip() ipAddress: string,
    @Res({ passthrough: true }) response: Response,
  ) {
    const result = await this.authService.verifyOtp(verifyOtpDto, userAgent, ipAddress);

    // Set refresh token in HttpOnly cookie
    response.cookie('refresh_token', result.refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
    });

    return result;
  }
}
