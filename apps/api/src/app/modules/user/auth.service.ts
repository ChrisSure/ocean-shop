import { BadRequestException, Injectable, Logger, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcryptjs';
import { User } from './entities/user.entity';
import { AuthOtp } from './entities/auth-otp.entity';
import { OtpChannel, OtpPurpose } from './entities/enums/auth-otp.enum';
import { UserSession } from './entities/user-session.entity';
import { RequestOtpDto } from './dto/request-otp.dto';
import { VerifyOtpDto } from './dto/verify-otp.dto';

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  constructor(
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    @InjectRepository(AuthOtp)
    private readonly authOtpRepository: Repository<AuthOtp>,
    @InjectRepository(UserSession)
    private readonly userSessionRepository: Repository<UserSession>,
    private readonly jwtService: JwtService,
  ) {}

  async requestOtp(dto: RequestOtpDto) {
    const { email, phone } = dto;
    if (!email && !phone) {
      throw new BadRequestException('Email or phone must be provided');
    }

    const user = await this.userRepository.findOne({
      where: email ? { email } : { mobileNumber: phone },
    });


    if (user) {
      await this.checkActiveOtpRequest(user.id);

      if (!this.isUserVerified(user, email, phone)) {
        throw new BadRequestException('Email or phone is not verified');
      }
      await this.handleExistingUserOtp(user, email, phone);
    } else {
      await this.handleNewUserOtp(email, phone);
    }


    return { message: 'OTP sent successfully' };
  }

  async verifyOtp(dto: VerifyOtpDto, userAgent?: string, ipAddress?: string) {
    const {email, phone, code} = dto;

    const user = await this.userRepository.findOne({
      where: email ? {email} : {mobileNumber: phone},
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    // Find latest active OTP
    // TypeORM might have issues with IsNull() if we don't import it, so using IsNull() via import or just where: { usedAt: IsNull() }
    // Wait, IsNull is not imported. I'll just use a raw query or simply skip the IsNull check and filter below,
    // or better, I can import IsNull from typeorm.
    // I'll adjust the query for now.
    const otps = await this.authOtpRepository.createQueryBuilder('otp')
      .where('otp.user_id = :userId', {userId: user.id})
      .andWhere('otp.used_at IS NULL')
      .orderBy('otp.created_at', 'DESC')
      .take(1)
      .getMany();

    const latestOtp = otps[0];

    if (!latestOtp) {
      throw new BadRequestException('No active OTP found');
    }

    if (latestOtp.expiresAt < new Date()) {
      throw new BadRequestException('OTP has expired');
    }

    const isValid = await bcrypt.compare(code, latestOtp.codeHash);
    if (!isValid) {
      latestOtp.attempts += 1;
      await this.authOtpRepository.save(latestOtp);
      throw new BadRequestException('Invalid OTP code');
    }

    // Mark as used
    latestOtp.usedAt = new Date();
    await this.authOtpRepository.save(latestOtp);

    // If it was register, verify email/phone
    if (latestOtp.purpose === OtpPurpose.REGISTER) {
      if (email) user.isEmailVerified = true;
      if (phone) user.isMobileVerified = true;
      await this.userRepository.save(user);
    }

    // Generate Tokens
    const payload = {sub: user.id, email: user.email, mobileNumber: user.mobileNumber};
    const accessToken = this.jwtService.sign(payload, {expiresIn: '15m'});
    const refreshToken = this.jwtService.sign(payload, {expiresIn: '7d'});

    // Save refresh token session
    const salt = await bcrypt.genSalt(10);
    const refreshTokenHash = await bcrypt.hash(refreshToken, salt);

    const session = this.userSessionRepository.create({
      userId: user.id,
      refreshTokenHash,
      userAgent: userAgent || null,
      ipAddress: ipAddress || null,
      expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days
    });
    await this.userSessionRepository.save(session);

    return {
      accessToken,
      refreshToken,
      user: {
        id: user.id,
        email: user.email,
        mobileNumber: user.mobileNumber,
      },
    };
  }

  private async generateOtpCodeAndHash(): Promise<{ code: string; codeHash: string }> {
    // Generate 4 digit code
    const code = Math.floor(1000 + Math.random() * 9000).toString();
    const salt = await bcrypt.genSalt(10);
    const codeHash = await bcrypt.hash(code, salt);
    return { code, codeHash };
  }

  private async saveOtp(userId: string, codeHash: string, email: string | undefined, purpose: OtpPurpose) {
    const expireTime = process.env.OTP_EXPIRE ? parseInt(process.env.OTP_EXPIRE, 10) : 5 * 60 * 1000;
    const otp = this.authOtpRepository.create({
      userId,
      codeHash,
      channel: email ? OtpChannel.EMAIL : OtpChannel.SMS,
      purpose,
      expiresAt: new Date(Date.now() + expireTime),
    });
    await this.authOtpRepository.save(otp);
  }

  private async handleExistingUserOtp(user: User, email: string | undefined, phone: string | undefined) {
    const purpose = OtpPurpose.LOGIN;
    await this.createAndLogOtp(user.id, email, phone, purpose);
  }

  private async handleNewUserOtp(email: string | undefined, phone: string | undefined) {
    let newUser = this.userRepository.create({
      email: email || null,
      mobileNumber: phone || null,
    });
    newUser = await this.userRepository.save(newUser);
    const purpose = OtpPurpose.REGISTER;
    await this.createAndLogOtp(newUser.id, email, phone, purpose);
  }

  private async createAndLogOtp(userId: string, email: string | undefined, phone: string | undefined, purpose: OtpPurpose) {
    const { code, codeHash } = await this.generateOtpCodeAndHash();
    await this.saveOtp(userId, codeHash, email, purpose);
    this.logger.log(`Generated OTP code for ${email || phone}: ${code}`);
  }

  private isUserVerified(user: User, email: string | undefined, phone: string | undefined): boolean {
    if (email) return user.isEmailVerified;
    if (phone) return user.isMobileVerified;
    return false;
  }

  private async checkActiveOtpRequest(userId: string) {
    const activeOtp = await this.authOtpRepository.createQueryBuilder('otp')
      .where('otp.user_id = :userId', { userId })
      .andWhere('otp.used_at IS NULL')
      .andWhere('otp.expires_at > :now', { now: new Date() })
      .getOne();

    if (activeOtp) {
      throw new BadRequestException('You have already sent a request. Please wait until it expires.');
    }
  }
}
